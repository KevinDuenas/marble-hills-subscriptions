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
      console.error('Error fetching products:', error);
    }

    return { offers, storeProducts };
  } catch (error) {
    console.error('Error loading One Time Offers:', error);
    return { offers: [], storeProducts: [] };
  }
};

export const action = async ({ request }) => {
  console.log('=== ONE TIME OFFERS ACTION CALLED ===');
  const { authenticate } = await import("../shopify.server");
  const prisma = (await import("../db.server")).default;
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  
  console.log('Action intent:', intent);
  console.log('Session shop:', session.shop);
  
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
                tags: ['one-time-offer', 'sb-one-time-offer']
              }
            }
          });

          console.log('GraphQL Response for', offer.title, ':', JSON.stringify(createResult, null, 2));

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
          const updateResult = await admin.graphql(`
            mutation productVariantUpdate($input: ProductVariantInput!) {
              productVariantUpdate(input: $input) {
                productVariant {
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
              input: {
                id: shopifyVariantId,
                price: offer.price.toString(),
                compareAtPrice: offer.comparedAtPrice ? offer.comparedAtPrice.toString() : null,
                inventoryPolicy: 'CONTINUE'
              }
            }
          });

          if (updateResult.data?.productVariantUpdate?.userErrors?.length > 0) {
            errors.push(`${offer.title} (variant update): ${updateResult.data.productVariantUpdate.userErrors.map(e => e.message).join(', ')}`);
            continue;
          }

          // Update the offer with Shopify IDs
          await prisma.oneTimeOffer.update({
            where: { id: offer.id },
            data: {
              shopifyProductId,
              shopifyVariantId
            }
          });

          created++;
          console.log(`Created Shopify product for offer: ${offer.title} (${shopifyProductId})`);

        } catch (error) {
          console.error(`Error creating Shopify product for ${offer.title}:`, error);
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
        price: parseFloat(formData.get("price")),
        comparedAtPrice: formData.get("comparedAtPrice") ? parseFloat(formData.get("comparedAtPrice")) : null,
        imageUrl: formData.get("imageUrl") || null,
        active: formData.get("active") === "true",
        sourceProductId: formData.get("sourceProductId") || null,
        sourceVariantId: formData.get("sourceVariantId") || null,
      };

      console.log('Form data to save:', JSON.stringify(data, null, 2));

      // Validate required fields
      if (!data.title || !data.price || data.price <= 0) {
        return { 
          error: "Title and valid price are required.",
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
          console.log(`Reusing existing Shopify product for position ${position}:`, existingOffer.shopifyProductId);
          
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
                tags: ['one-time-offer'],
              }
            }
          });

          const updateResult = await updateProductResponse.json();
          if (updateResult.data?.productUpdate?.userErrors?.length > 0) {
            console.error('Shopify product update errors:', updateResult.data.productUpdate.userErrors);
          }

          // Skip variant updates for now - just use product-level changes
          
          shopifyProductId = existingOffer.shopifyProductId;
          shopifyVariantId = existingOffer.shopifyVariantId;
        } else {
          // Check if there are any existing One Time Offer products we can reuse
          // This handles the case where products exist but aren't linked to this position yet
          const existingProducts = await admin.graphql(`
            query getOneTimeOfferProducts {
              products(first: 10, query: "tag:one-time-offer") {
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
          
          // Check if we have fewer than 3 products, if so create a new one
          if (oneTimeOfferProducts.length < 3) {
            console.log(`Creating new Shopify product for position ${position} (${oneTimeOfferProducts.length}/3 products exist)`);
            
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
                  tags: ['one-time-offer'],
                }
              }
            });

            const createResult = await createProductResponse.json();
            
            if (createResult.data?.productCreate?.userErrors?.length > 0) {
              console.error('Shopify product creation errors:', createResult.data.productCreate.userErrors);
              throw new Error(`Failed to create Shopify product: ${createResult.data.productCreate.userErrors.map(e => e.message).join(', ')}`);
            }

            shopifyProductId = createResult.data.productCreate.product.id;
            shopifyVariantId = createResult.data.productCreate.product.variants.edges[0].node.id;
          } else {
            // Reuse the oldest product (first in the list)
            const productToReuse = oneTimeOfferProducts[0].node;
            console.log(`Reusing existing product (max 3 reached) for position ${position}:`, productToReuse.id);
            
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
                  tags: ['one-time-offer'],
                }
              }
            });

            const updateResult = await updateProductResponse.json();
            if (updateResult.data?.productUpdate?.userErrors?.length > 0) {
              console.error('Shopify product update errors:', updateResult.data.productUpdate.userErrors);
            }

            shopifyProductId = productToReuse.id;
            shopifyVariantId = productToReuse.variants.edges[0].node.id;
          }

          // Skip variant updates for now - just use product-level changes
        }

        // Add Shopify IDs to our data
        data.shopifyProductId = shopifyProductId;
        data.shopifyVariantId = shopifyVariantId;
        
        console.log(`One Time Offer for position ${position} linked to Shopify product:`, shopifyProductId);

      } catch (shopifyError) {
        console.error('Error managing Shopify product:', shopifyError);
        console.error('Full error details:', shopifyError.message, shopifyError.stack);
        // Continue without Shopify product - we'll handle this in the frontend
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

      console.log('One Time Offer saved:', upsertedOffer.id, 'Shopify Product:', shopifyProductId);

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
    console.error('Error in One Time Offers action:', error);
    return { error: "Server error", success: false };
  }
};

export default function OneTimeOffersPage() {
  console.log('OneTimeOffersPage component mounting...');
  
  const { offers, storeProducts } = useLoaderData();
  const fetcher = useFetcher();
  const [showToast, setShowToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingPosition, setEditingPosition] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  console.log('OneTimeOffersPage state initialized');
  console.log('offers:', offers);
  console.log('storeProducts:', storeProducts);

  // Initialize offers array with 3 positions
  const offersArray = [1, 2, 3].map(position => 
    offers.find(offer => offer.position === position) || {
      position,
      title: "",
      description: "",
      price: "",
      comparedAtPrice: "",
      imageUrl: "",
      active: true
    }
  );

  const [formData, setFormData] = useState(offersArray[0]);

  function handleEdit(position) {
    console.log('handleEdit called with position:', position);
    console.log('offersArray:', offersArray);
    try {
      const offer = offersArray.find(o => o.position === position);
      console.log('Found offer:', offer);
      setFormData({
        ...offer,
        price: offer.price?.toString() || "",
        comparedAtPrice: offer.comparedAtPrice?.toString() || ""
      });
      console.log('Setting editingPosition to:', position);
      setEditingPosition(position);
      console.log('handleEdit completed successfully');
    } catch (error) {
      console.error('Error in handleEdit:', error);
    }
  }

  const handleInputChange = (field) => (value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.price || parseFloat(formData.price) <= 0) {
      alert('Title and valid price are required.');
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
      price: variant.price || "",
      comparedAtPrice: variant.compareAtPrice || "",
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
    console.log('OneTimeOffersPage mounted with useEffect!');
    console.log('DOM loaded, component is working');
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
              Configura hasta 3 productos especiales que aparecerán en el paso 3 del formulario de suscripción. 
              Puedes crearlos manualmente o copiar datos de productos existentes de tu tienda.
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
                const hasData = offer.title && offer.price;
                
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
                                  Precio: ${offer.price}
                                  {offer.comparedAtPrice && (
                                    <Text as="span" tone="subdued" textDecorationLine="line-through">
                                      {" "}${offer.comparedAtPrice}
                                    </Text>
                                  )}
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
              label="Título del Producto"
              value={formData.title}
              onChange={handleInputChange('title')}
              helpText="Nombre que aparecerá en la oferta"
            />
            
            <TextField
              label="Descripción"
              value={formData.description}
              onChange={handleInputChange('description')}
              multiline={4}
              helpText="Descripción opcional del producto"
            />
            
            <FormLayout.Group>
              <TextField
                label="Precio"
                type="number"
                value={formData.price}
                onChange={handleInputChange('price')}
                prefix="$"
                helpText="Precio de venta"
              />
              
              <TextField
                label="Precio Comparativo"
                type="number"
                value={formData.comparedAtPrice}
                onChange={handleInputChange('comparedAtPrice')}
                prefix="$"
                helpText="Precio antes del descuento (opcional)"
              />
            </FormLayout.Group>
            
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