import { useState, useEffect } from "react";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  Text,
  BlockStack,
  Toast,
  Form,
  InlineCode,
  Modal,
  ResourceList,
  Thumbnail,
  Box,
  InlineStack,
  Badge,
  Select,
  ButtonGroup
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const prisma = (await import("../db.server")).default;
  const { session, admin } = await authenticate.admin(request);
  
  try {
    // Get existing One Time Offers
    const offers = await prisma.oneTimeOffer.findMany({
      where: { shop: session.shop },
      orderBy: { position: 'asc' }
    });

    // Get store products for copying
    let storeProducts = [];
    try {
      const productsResponse = await admin.graphql(`
        query getProducts($first: Int!) {
          products(first: $first) {
            edges {
              node {
                id
                title
                handle
                description
                images(first: 1) {
                  edges {
                    node {
                      url
                    }
                  }
                }
                variants(first: 5) {
                  edges {
                    node {
                      id
                      title
                      price
                      compareAtPrice
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        variables: { first: 50 }
      });

      const productsData = await productsResponse.json();
      storeProducts = productsData.data?.products?.edges?.map(edge => edge.node) || [];
    } catch (error) {
    }

    return { offers, storeProducts };
  } catch (error) {
    return { offers: [], storeProducts: [] };
  }
};

export const action = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const prisma = (await import("../db.server")).default;
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  
  
  try {
    if (intent === "create-missing-products") {
      const { admin } = await authenticate.admin(request);
      
      // Find all offers without Shopify products
      const offersWithoutProducts = await prisma.oneTimeOffer.findMany({
        where: { 
          shop: session.shop,
          OR: [
            { shopifyVariantId: null },
            { shopifyVariantId: "" }
          ]
        }
      });

      let created = 0;
      let errors = [];

      for (const offer of offersWithoutProducts) {
        try {
          // Create Shopify product
          const createResult = await admin.graphql(`
            mutation productCreate($input: ProductInput!) {
              productCreate(input: $input) {
                product {
                  id
                  variants(first: 1) {
                    edges {
                      node {
                        id
                        price
                      }
                    }
                  }
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `, {
            variables: {
              input: {
                title: offer.title,
                descriptionHtml: offer.description || '',
                tags: ['one-time-offer', 'sb-one-time-offer'],
                metafields: [
                  {
                    namespace: "seo",
                    key: "hidden",
                    value: "1",
                    type: "number_integer"
                  }
                ]
              }
            }
          });


          if (!createResult.data) {
            errors.push(`${offer.title}: Invalid GraphQL response - no data returned`);
            continue;
          }

          if (createResult.data?.productCreate?.userErrors?.length > 0) {
            errors.push(`${offer.title}: ${createResult.data.productCreate.userErrors.map(e => e.message).join(', ')}`);
            continue;
          }

          if (!createResult.data.productCreate?.product) {
            errors.push(`${offer.title}: No product returned from GraphQL`);
            continue;
          }

          const shopifyProductId = createResult.data.productCreate.product.id;
          const shopifyVariantId = createResult.data.productCreate.product.variants.edges[0].node.id;

          // Now update the variant with price and compareAtPrice

          const updateVariantResponse = await admin.graphql(`
            mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                productVariants {
                  id
                  price
                  compareAtPrice
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `, {
            variables: {
              productId: shopifyProductId,
              variants: [{
                id: shopifyVariantId,
                price: "0.00", // Always free for one-time offers
                compareAtPrice: null, // No compare pricing for free offers
                inventoryPolicy: 'CONTINUE'
              }]
            }
          });

          const updateResult = await updateVariantResponse.json();

          if (updateResult.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
            errors.push(`${offer.title} (variant update): ${updateResult.data.productVariantsBulkUpdate.userErrors.map(e => e.message).join(', ')}`);
            continue;
          }

          const updatedVariants = updateResult.data?.productVariantsBulkUpdate?.productVariants || [];
          const updatedPrice = updatedVariants[0]?.price;

          // Update the offer with Shopify IDs
          await prisma.oneTimeOffer.update({
            where: { id: offer.id },
            data: {
              shopifyProductId,
              shopifyVariantId
            }
          });

          created++;

        } catch (error) {
          errors.push(`${offer.title}: ${error.message}`);
        }
      }

      return { 
        success: true, 
        created, 
        errors: errors.length > 0 ? errors : null,
        message: `Created ${created} Shopify products${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
      };
    }
    
    if (intent === "save") {
      const { admin } = await authenticate.admin(request);
      const position = parseInt(formData.get("position"));
      const data = {
        shop: session.shop,
        position,
        title: formData.get("title"),
        description: formData.get("description") || null,
        price: 0, // Always $0 for one-time offers
        comparedAtPrice: null, // No compare pricing needed for free offers
        imageUrl: formData.get("imageUrl") || null,
        active: formData.get("active") === "true",
        sourceProductId: formData.get("sourceProductId") || null,
        sourceVariantId: formData.get("sourceVariantId") || null,
      };


      // Validate required fields
      if (!data.title) {
        return {
          error: "Title is required.",
          success: false
        };
      }

      // Validate position (1, 2, or 3)
      if (position < 1 || position > 3) {
        return { 
          error: "Position must be 1, 2, or 3.",
          success: false 
        };
      }

      // Implement maximum 3 products system - reuse existing Shopify products by position
      let shopifyProductId = null;
      let shopifyVariantId = null;

      try {
        // Check if we already have a Shopify product for this position
        const existingOffer = await prisma.oneTimeOffer.findUnique({
          where: { 
            shop_position: { 
              shop: session.shop, 
              position: position 
            } 
          }
        });

        if (existingOffer && existingOffer.shopifyProductId) {
          // Reuse existing Shopify product - just update it
          
          const updateProductResponse = await admin.graphql(`
            mutation productUpdate($input: ProductInput!) {
              productUpdate(input: $input) {
                product {
                  id
                  variants(first: 1) {
                    edges {
                      node {
                        id
                      }
                    }
                  }
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `, {
            variables: {
              input: {
                id: existingOffer.shopifyProductId,
                title: data.title,
                descriptionHtml: data.description || '',
                tags: ['one-time-offer', 'sb-one-time-offer'],
                metafields: [
                  {
                    namespace: "seo",
                    key: "hidden",
                    value: "1",
                    type: "number_integer"
                  }
                ]
              }
            }
          });

          const updateResult = await updateProductResponse.json();
          if (updateResult.data?.productUpdate?.userErrors?.length > 0) {
          }

          // CRITICAL: Always update variant price to $0
          const variantId = existingOffer.shopifyVariantId;

          const updateVariantResponse = await admin.graphql(`
            mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                productVariants {
                  id
                  price
                  compareAtPrice
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `, {
            variables: {
              productId: existingOffer.shopifyProductId,
              variants: [{
                id: variantId,
                price: "0.00", // Always free for one-time offers
                compareAtPrice: null,
                inventoryPolicy: 'CONTINUE'
              }]
            }
          });

          const variantUpdateResult = await updateVariantResponse.json();

          if (variantUpdateResult.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
          } else {
            const updatedVariants = variantUpdateResult.data?.productVariantsBulkUpdate?.productVariants || [];
            const updatedPrice = updatedVariants[0]?.price;
          }

          shopifyProductId = existingOffer.shopifyProductId;
          shopifyVariantId = existingOffer.shopifyVariantId;
        } else {
          // Check if there are any existing One Time Offer products we can reuse
          // This handles the case where products exist but aren't linked to this position yet
          const existingProducts = await admin.graphql(`
            query getOneTimeOfferProducts {
              products(first: 10, query: "tag:sb-one-time-offer") {
                edges {
                  node {
                    id
                    title
                    tags
                    variants(first: 1) {
                      edges {
                        node {
                          id
                        }
                      }
                    }
                  }
                }
              }
            }
          `);

          const productsResult = await existingProducts.json();
          const oneTimeOfferProducts = productsResult.data?.products?.edges || [];
          
          // FIXED: Each position needs its own unique product
          // Check if we need to create a new product for this specific position
          // We'll create up to 3 products total (one for each position)
          const positionIndex = parseInt(data.position) - 1; // Convert position to 0-based index

          // SAFE: Always create a new product for new offers
          // Only reuse products when updating existing offers
          if (!existingOffer) {
            
            const createProductResponse = await admin.graphql(`
              mutation productCreate($input: ProductInput!) {
                productCreate(input: $input) {
                  product {
                    id
                    variants(first: 1) {
                      edges {
                        node {
                          id
                        }
                      }
                    }
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }
            `, {
              variables: {
                input: {
                  title: data.title,
                  descriptionHtml: data.description || '',
                  tags: ['sb-one-time-offer'],
                  metafields: [
                    {
                      namespace: "seo",
                      key: "hidden",
                      value: "1",
                      type: "number_integer"
                    }
                  ]
                }
              }
            });

            const createResult = await createProductResponse.json();
            
            if (createResult.data?.productCreate?.userErrors?.length > 0) {
              throw new Error(`Failed to create Shopify product: ${createResult.data.productCreate.userErrors.map(e => e.message).join(', ')}`);
            }

            shopifyProductId = createResult.data.productCreate.product.id;
            shopifyVariantId = createResult.data.productCreate.product.variants.edges[0].node.id;

            // CRITICAL: Update new variant price to $0

            const updateNewVariantResponse = await admin.graphql(`
              mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                  productVariants {
                    id
                    price
                    compareAtPrice
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }
            `, {
              variables: {
                productId: shopifyProductId,
                variants: [{
                  id: shopifyVariantId,
                  price: "0.00", // Always free for one-time offers
                  compareAtPrice: null,
                  inventoryPolicy: 'CONTINUE'
                }]
              }
            });

            const newVariantUpdateResult = await updateNewVariantResponse.json();

            if (newVariantUpdateResult.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
            } else {
              const updatedVariants = newVariantUpdateResult.data?.productVariantsBulkUpdate?.productVariants || [];
              const updatedPrice = updatedVariants[0]?.price;
            }
          } else if (existingOffer) {
            // FIXED: For existing offers, keep using their assigned product
            // This preserves the product association when updating
            shopifyProductId = existingOffer.shopifyProductId;
            shopifyVariantId = existingOffer.shopifyVariantId;
            
            // Update the existing product
            const updateProductResponse = await admin.graphql(`
              mutation productUpdate($input: ProductInput!) {
                productUpdate(input: $input) {
                  product {
                    id
                    variants(first: 1) {
                      edges {
                        node {
                          id
                        }
                      }
                    }
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }
            `, {
              variables: {
                input: {
                  id: productToReuse.id,
                  title: data.title,
                  descriptionHtml: data.description || '',
                  tags: ['sb-one-time-offer'],
                }
              }
            });

            const updateResult = await updateProductResponse.json();
            if (updateResult.data?.productUpdate?.userErrors?.length > 0) {
            }

            shopifyProductId = existingOffer.shopifyProductId;
            shopifyVariantId = existingOffer.shopifyVariantId;

          }

          // CRITICAL: Always update variant price to $0 for all products (new or existing)
          const updateVariantResponse = await admin.graphql(`
            mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                productVariants {
                  id
                  price
                  compareAtPrice
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `, {
            variables: {
              productId: shopifyProductId,
              variants: [{
                id: shopifyVariantId,
                price: "0.00", // Always free for one-time offers
                compareAtPrice: null,
                inventoryPolicy: 'CONTINUE'
              }]
            }
          });

          const variantUpdateResult = await updateVariantResponse.json();

          if (variantUpdateResult.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
          } else {
            const updatedVariants = variantUpdateResult.data?.productVariantsBulkUpdate?.productVariants || [];
            const updatedPrice = updatedVariants[0]?.price;
          }

          // All variants now guaranteed to be $0
        }

        // Add Shopify IDs to our data
        data.shopifyProductId = shopifyProductId;
        data.shopifyVariantId = shopifyVariantId;


      } catch (shopifyError) {
      }


      const upsertedOffer = await prisma.oneTimeOffer.upsert({
        where: {
          shop_position: {
            shop: session.shop,
            position: position
          }
        },
        update: data,
        create: data
      });


      return { success: true };
    }

    if (intent === "delete") {
      const position = parseInt(formData.get("position"));
      
      await prisma.oneTimeOffer.deleteMany({
        where: { 
          shop: session.shop, 
          position: position 
        }
      });

      return { success: true };
    }

    return { error: "Invalid action", success: false };
  } catch (error) {
    return { error: "Server error", success: false };
  }
};

export default function OneTimeOffersPage() {
  
  const { offers, storeProducts } = useLoaderData();
  const fetcher = useFetcher();
  const [showToast, setShowToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingPosition, setEditingPosition] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  

  // Initialize offers array with 3 positions
  const offersArray = [1, 2, 3].map(position =>
    offers.find(offer => offer.position === position) || {
      position,
      title: "",
      description: "",
      price: 0, // Always $0 for one-time offers
      comparedAtPrice: null,
      imageUrl: "",
      active: true
    }
  );

  const [formData, setFormData] = useState(offersArray[0]);

  function handleEdit(position) {
    try {
      const offer = offersArray.find(o => o.position === position);
      setFormData({
        ...offer,
        price: 0, // Always $0 for one-time offers
        comparedAtPrice: null
      });
      setEditingPosition(position);
    } catch (error) {
    }
  }

  const handleInputChange = (field) => (value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {

    // Only validate title
    if (!formData.title) {
      alert('Title is required.');
      return;
    }


    const submitData = {
      ...formData,
      position: editingPosition,
      intent: "save"
    };

    fetcher.submit(submitData, { method: "POST" });
  };

  const handleDelete = (position) => {
    if (confirm('Are you sure you want to delete this offer?')) {
      fetcher.submit({ intent: "delete", position }, { method: "POST" });
    }
  };

  const handleCopyFromProduct = (product, variant) => {
    setFormData(prev => ({
      ...prev,
      title: `${product.title} - ${variant.title}`,
      description: product.description || "",
      price: 0, // Always $0 for one-time offers
      comparedAtPrice: null,
      imageUrl: product.images?.edges?.[0]?.node?.url || "",
      sourceProductId: product.id,
      sourceVariantId: variant.id
    }));
    setShowProductModal(false);
  };

  const isLoading = fetcher.state === "submitting";
  const isSuccess = fetcher.data?.success && fetcher.state === "idle";
  const hasError = fetcher.data?.error && fetcher.state === "idle";

  // Component mount effect
  useEffect(() => {
  }, []);

  // Show toast after successful submission
  useEffect(() => {
    if (isSuccess) {
      setShowToast(true);
      setEditingPosition(null);
      // Reload page data
      window.location.reload();
    } else if (hasError) {
      setErrorMessage(fetcher.data.error);
      setShowErrorToast(true);
    }
  }, [isSuccess, hasError, fetcher.data]);

  return (
    <Page>
      <TitleBar title="One Time Offers Management" />
      {showToast && (
        <Toast
          content="One Time Offer saved successfully!"
          onDismiss={() => setShowToast(false)}
        />
      )}
      {showErrorToast && (
        <Toast
          content={errorMessage}
          error
          onDismiss={() => setShowErrorToast(false)}
        />
      )}
      
      <Layout>
        {/* Banner informativo */}
        <Layout.Section>
          <Banner title="Gestión de Ofertas Especiales" status="info">
            <p>
              Configura hasta 3 productos especiales <strong>GRATUITOS</strong> que aparecerán en el paso 3 del formulario de suscripción.
              Estas ofertas siempre son gratis ($0) para los nuevos suscriptores.
            </p>
          </Banner>
        </Layout.Section>


        {/* Current Offers Overview */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingLg" as="h2">
                Ofertas Actuales
              </Text>
              
              
              {offersArray.map((offer) => {
                const hasData = offer.title; // Only title is required
                
                return (
                  <Card key={offer.position} sectioned>
                    <InlineStack align="space-between">
                      <Box>
                        <InlineStack gap="300" align="center">
                          {offer.imageUrl && (
                            <Thumbnail
                              source={offer.imageUrl}
                              alt={offer.title}
                              size="medium"
                            />
                          )}
                          <BlockStack gap="100">
                            <Text variant="bodyMd" fontWeight="bold">
                              Posición {offer.position}: {hasData ? offer.title : "Sin configurar"}
                            </Text>
                            {hasData && (
                              <BlockStack gap="050">
                                <Text variant="bodyMd">
                                  <Badge tone="success">FREE</Badge>
                                </Text>
                                <Badge tone={offer.active ? "success" : "critical"}>
                                  {offer.active ? "Activo" : "Inactivo"}
                                </Badge>
                              </BlockStack>
                            )}
                          </BlockStack>
                        </InlineStack>
                      </Box>
                      <div>
                        <Button 
                          primary={!hasData}
                          onClick={() => handleEdit(offer.position)}
                        >
                          {hasData ? "Editar" : "Configurar"}
                        </Button>
                        {hasData && (
                          <Button 
                            tone="critical" 
                            onClick={() => handleDelete(offer.position)}
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </InlineStack>
                  </Card>
                );
              })}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Edit Modal */}
      <Modal
        open={editingPosition !== null}
        onClose={() => setEditingPosition(null)}
        title={`Configurar Oferta - Posición ${editingPosition}`}
        primaryAction={{
          content: "Guardar",
          onAction: handleSubmit,
          loading: isLoading
        }}
        secondaryActions={[
          {
            content: "Cancelar",
            onAction: () => setEditingPosition(null)
          },
          {
            content: "Copiar de Producto",
            onAction: () => setShowProductModal(true)
          }
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Product Title"
              value={formData.title}
              onChange={handleInputChange('title')}
              helpText="Name that will appear in the offer"
            />
            
            <TextField
              label="Description"
              value={formData.description}
              onChange={handleInputChange('description')}
              multiline={4}
              helpText="Optional product description"
            />
            
            {/* Price is automatically set to $0 for all one-time offers */}
            
            <TextField
              label="URL de Imagen"
              value={formData.imageUrl}
              onChange={handleInputChange('imageUrl')}
              helpText="URL de la imagen del producto"
            />
            
            <Select
              label="Estado"
              options={[
                {label: 'Activo', value: 'true'},
                {label: 'Inactivo', value: 'false'}
              ]}
              value={formData.active?.toString()}
              onChange={handleInputChange('active')}
            />
          </FormLayout>
        </Modal.Section>
      </Modal>

      {/* Product Selection Modal */}
      <Modal
        open={showProductModal}
        onClose={() => setShowProductModal(false)}
        title="Seleccionar Producto de la Tienda"
        large
      >
        <Modal.Section>
          <ResourceList
            resourceName={{ singular: 'producto', plural: 'productos' }}
            items={storeProducts}
            renderItem={(product) => (
              <ResourceList.Item id={product.id}>
                <InlineStack gap="300" align="center">
                  {product.images?.edges?.[0] && (
                    <Thumbnail
                      source={product.images.edges[0].node.url}
                      alt={product.title}
                      size="medium"
                    />
                  )}
                  <BlockStack gap="100">
                    <Text variant="bodyMd" fontWeight="bold">
                      {product.title}
                    </Text>
                    <Text variant="bodyMd" tone="subdued">
                      {product.variants?.edges?.length || 0} variantes
                    </Text>
                    <BlockStack gap="050">
                      {product.variants?.edges?.map((variantEdge, index) => {
                        const variant = variantEdge.node;
                        return (
                          <InlineStack key={variant.id} gap="200" align="center">
                            <Text variant="bodySm">
                              {variant.title} - ${variant.price}
                              {variant.compareAtPrice && (
                                <Text as="span" tone="subdued" textDecorationLine="line-through">
                                  {" "}${variant.compareAtPrice}
                                </Text>
                              )}
                            </Text>
                            <Button 
                              size="micro" 
                              onClick={() => handleCopyFromProduct(product, variant)}
                            >
                              Usar
                            </Button>
                          </InlineStack>
                        );
                      })}
                    </BlockStack>
                  </BlockStack>
                </InlineStack>
              </ResourceList.Item>
            )}
          />
        </Modal.Section>
      </Modal>
    </Page>
  );
}