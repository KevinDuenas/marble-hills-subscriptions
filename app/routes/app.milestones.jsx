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
  Select,
  InlineStack
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const prisma = (await import("../db.server")).default;
  const { session, admin } = await authenticate.admin(request);
  
  let config = await prisma.subscriptionConfig.findUnique({
    where: { shop: session.shop }
  });

  if (!config) {
    config = await prisma.subscriptionConfig.create({
      data: {
        shop: session.shop,
      }
    });
  }

  // Fetch available Selling Plans from Shopify
  let sellingPlans = [];
  try {
    const response = await admin.graphql(`
      query getSellingPlans {
        sellingPlanGroups(first: 50) {
          edges {
            node {
              id
              name
              sellingPlans(first: 50) {
                edges {
                  node {
                    id
                    name
                    billingPolicy {
                      ... on SellingPlanRecurringBillingPolicy {
                        interval
                        intervalCount
                      }
                    }
                    deliveryPolicy {
                      ... on SellingPlanRecurringDeliveryPolicy {
                        interval
                        intervalCount
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);

    const data = await response.json();
    
    console.log('=== FETCHING SELLING PLANS FROM SHOPIFY ===');
    console.log('Raw GraphQL Response:', JSON.stringify(data, null, 2));
    
    // Process selling plans to extract the ones we need
    if (data?.data?.sellingPlanGroups?.edges) {
      console.log(`Found ${data.data.sellingPlanGroups.edges.length} Selling Plan Groups`);
      
      data.data.sellingPlanGroups.edges.forEach(group => {
        console.log(`\nProcessing Group: ${group.node?.name} (ID: ${group.node?.id})`);
        
        if (group.node?.sellingPlans?.edges) {
          group.node.sellingPlans.edges.forEach(plan => {
            const node = plan.node;
            if (node) {
              // Extract interval information
              const deliveryInterval = node.deliveryPolicy?.interval || '';
              const deliveryCount = node.deliveryPolicy?.intervalCount || 0;
              
              console.log(`  - Plan: ${node.name}`);
              console.log(`    ID: ${node.id}`);
              console.log(`    Delivery Policy: ${deliveryInterval} x ${deliveryCount}`);
              console.log(`    Billing Policy: ${node.billingPolicy?.interval} x ${node.billingPolicy?.intervalCount}`);
              
              // Convert to weeks if needed
              let weeksInterval = 0;
              if (deliveryInterval === 'WEEK') {
                weeksInterval = deliveryCount;
              } else if (deliveryInterval === 'DAY') {
                weeksInterval = Math.round(deliveryCount / 7);
              } else if (deliveryInterval === 'MONTH') {
                weeksInterval = deliveryCount * 4;
              }
              
              console.log(`    Calculated weeks interval: ${weeksInterval}`);
              
              sellingPlans.push({
                id: node.id,
                name: node.name,
                groupName: group.node.name,
                interval: deliveryInterval,
                intervalCount: deliveryCount,
                weeksInterval: weeksInterval,
                displayName: `${node.name} (${group.node.name})`
              });
            }
          });
        }
      });
    } else {
      console.log('No Selling Plan Groups found in the response');
    }
    
    // Sort selling plans by weeks interval
    sellingPlans.sort((a, b) => a.weeksInterval - b.weeksInterval);
    
    console.log('\n=== SELLING PLANS SUMMARY ===');
    console.log(`Total plans found: ${sellingPlans.length}`);
    sellingPlans.forEach(plan => {
      console.log(`- ${plan.id}: ${plan.displayName} (${plan.weeksInterval} weeks)`);
    });
    console.log('=============================\n');
    
  } catch (error) {
    console.error('Error fetching selling plans:', error);
  }

  return { config, sellingPlans };
};

export const action = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const prisma = (await import("../db.server")).default;
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const data = {
    milestone1Items: parseInt(formData.get("milestone1Items")),
    milestone1Discount: parseFloat(formData.get("milestone1Discount")),
    milestone1_2weeks: formData.get("milestone1_2weeks"),
    milestone1_4weeks: formData.get("milestone1_4weeks"),
    milestone1_6weeks: formData.get("milestone1_6weeks"),
    milestone2Items: parseInt(formData.get("milestone2Items")),
    milestone2Discount: parseFloat(formData.get("milestone2Discount")),
    milestone2_2weeks: formData.get("milestone2_2weeks"),
    milestone2_4weeks: formData.get("milestone2_4weeks"),
    milestone2_6weeks: formData.get("milestone2_6weeks"),
  };

  // Validar que milestone 2 tenga más cantidad que milestone 1
  if (data.milestone2Items <= data.milestone1Items) {
    return { 
      error: "La cantidad de productos de Milestone 2 debe ser mayor que la de Milestone 1.",
      success: false 
    };
  }

  // Validar que todos los Selling Plan IDs estén presentes
  const requiredFields = [
    'milestone1_2weeks', 'milestone1_4weeks', 'milestone1_6weeks',
    'milestone2_2weeks', 'milestone2_4weeks', 'milestone2_6weeks'
  ];
  
  const emptyFields = requiredFields.filter(field => !data[field]?.trim());
  
  if (emptyFields.length > 0) {
    return { 
      error: "Todos los Selling Plan IDs son obligatorios.",
      success: false 
    };
  }

  await prisma.subscriptionConfig.upsert({
    where: { shop: session.shop },
    update: data,
    create: {
      shop: session.shop,
      ...data,
    }
  });

  return { success: true };
};

export default function MilestonesPage() {
  const { config, sellingPlans } = useLoaderData();
  const fetcher = useFetcher();
  const [showToast, setShowToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSellingPlans, setShowSellingPlans] = useState(false);

  const [formData, setFormData] = useState({
    milestone1Items: config.milestone1Items?.toString() || "6",
    milestone1Discount: config.milestone1Discount?.toString() || "5",
    milestone1_2weeks: config.milestone1_2weeks || "",
    milestone1_4weeks: config.milestone1_4weeks || "",
    milestone1_6weeks: config.milestone1_6weeks || "",
    milestone2Items: config.milestone2Items?.toString() || "10", 
    milestone2Discount: config.milestone2Discount?.toString() || "10",
    milestone2_2weeks: config.milestone2_2weeks || "",
    milestone2_4weeks: config.milestone2_4weeks || "",
    milestone2_6weeks: config.milestone2_6weeks || "",
  });

  const handleInputChange = (field) => (value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-populate selling plan IDs based on detected intervals
  const handleAutoPopulate = () => {
    console.log('=== AUTO-POPULATE SELLING PLAN IDS ===');
    console.log('Available Selling Plans:', sellingPlans);
    
    if (!sellingPlans || sellingPlans.length === 0) {
      console.log('ERROR: No selling plans found');
      alert('No se encontraron Selling Plans configurados en tu tienda. Por favor, configura los planes de suscripción primero.');
      return;
    }

    // Find plans for each interval (2, 4, 6 weeks)
    const plan2weeks = sellingPlans.find(p => p.weeksInterval === 2);
    const plan4weeks = sellingPlans.find(p => p.weeksInterval === 4);
    const plan6weeks = sellingPlans.find(p => p.weeksInterval === 6);

    console.log('Matching plans:');
    console.log('  2 weeks plan:', plan2weeks ? `${plan2weeks.id} - ${plan2weeks.displayName}` : 'NOT FOUND');
    console.log('  4 weeks plan:', plan4weeks ? `${plan4weeks.id} - ${plan4weeks.displayName}` : 'NOT FOUND');
    console.log('  6 weeks plan:', plan6weeks ? `${plan6weeks.id} - ${plan6weeks.displayName}` : 'NOT FOUND');

    const updates = {};
    
    // Check if we found plans for each interval
    const missingIntervals = [];
    if (!plan2weeks) missingIntervals.push('2 semanas');
    if (!plan4weeks) missingIntervals.push('4 semanas');
    if (!plan6weeks) missingIntervals.push('6 semanas');

    if (missingIntervals.length > 0) {
      const foundPlans = sellingPlans.map(p => `${p.displayName} (${p.weeksInterval} semanas)`).join('\n');
      console.log('WARNING: Missing intervals:', missingIntervals);
      alert(`No se encontraron planes para: ${missingIntervals.join(', ')}\n\nPlanes encontrados:\n${foundPlans}`);
    }

    // Populate with found plans (using the same plan ID for both milestones)
    if (plan2weeks) {
      updates.milestone1_2weeks = plan2weeks.id;
      updates.milestone2_2weeks = plan2weeks.id;
      console.log(`Setting 2 weeks IDs to: ${plan2weeks.id}`);
    }
    if (plan4weeks) {
      updates.milestone1_4weeks = plan4weeks.id;
      updates.milestone2_4weeks = plan4weeks.id;
      console.log(`Setting 4 weeks IDs to: ${plan4weeks.id}`);
    }
    if (plan6weeks) {
      updates.milestone1_6weeks = plan6weeks.id;
      updates.milestone2_6weeks = plan6weeks.id;
      console.log(`Setting 6 weeks IDs to: ${plan6weeks.id}`);
    }

    console.log('Final updates to apply:', updates);
    setFormData(prev => ({ ...prev, ...updates }));
    setShowToast(true);
  };

  const handleSubmit = () => {
    // Validar que todos los Selling Plan IDs estén llenos
    const requiredFields = [
      'milestone1_2weeks', 'milestone1_4weeks', 'milestone1_6weeks',
      'milestone2_2weeks', 'milestone2_4weeks', 'milestone2_6weeks'
    ];
    
    const emptyFields = requiredFields.filter(field => !formData[field]?.trim());
    
    if (emptyFields.length > 0) {
      alert('Todos los Selling Plan IDs son obligatorios. Por favor completa todos los campos.');
      return;
    }
    
    // Validar que milestone 2 tenga más cantidad que milestone 1
    const milestone1Items = parseInt(formData.milestone1Items);
    const milestone2Items = parseInt(formData.milestone2Items);
    
    if (milestone2Items <= milestone1Items) {
      alert('La cantidad de productos de Milestone 2 debe ser mayor que la de Milestone 1.');
      return;
    }
    
    fetcher.submit(formData, { method: "POST" });
  };

  const isLoading = fetcher.state === "submitting";
  const isSuccess = fetcher.data?.success && fetcher.state === "idle";
  const hasError = fetcher.data?.error && fetcher.state === "idle";

  // Show toast after successful submission
  useEffect(() => {
    if (isSuccess) {
      setShowToast(true);
    } else if (hasError) {
      setErrorMessage(fetcher.data.error);
      setShowErrorToast(true);
    }
  }, [isSuccess, hasError, fetcher.data]);

  return (
    <Page>
      <TitleBar title="Milestone Configuration" />
      {showToast && (
        <Toast
          content="Configuration saved successfully!"
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
          <Banner title="Configuración de Milestones de Descuento" status="info">
            <p>
              Configura las metas de productos y descuentos que aparecerán en la barra de progreso
              del formulario de suscripción. Cada milestone requiere los <InlineCode>Selling Plan IDs</InlineCode> 
              correspondientes para las 3 frecuencias de entrega.
            </p>
          </Banner>
        </Layout.Section>

        {/* Auto-populate section */}
        {sellingPlans && sellingPlans.length > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h3">
                  Auto-configuración de Selling Plans
                </Text>
                <Text variant="bodyMd" color="subdued">
                  Detectamos {sellingPlans.length} Selling Plans en tu tienda. 
                  Haz clic para auto-llenar los IDs basados en los intervalos de entrega.
                </Text>
                <InlineStack gap="300">
                  <Button onClick={handleAutoPopulate}>
                    Auto-llenar Selling Plan IDs
                  </Button>
                  <Button 
                    plain
                    onClick={() => setShowSellingPlans(!showSellingPlans)}
                  >
                    {showSellingPlans ? 'Ocultar' : 'Ver'} planes disponibles
                  </Button>
                </InlineStack>
                {showSellingPlans && (
                  <Banner status="info">
                    <BlockStack gap="200">
                      <Text variant="headingSm">Selling Plans disponibles:</Text>
                      {sellingPlans.map((plan, index) => (
                        <Text key={index} variant="bodyMd">
                          <InlineCode>{plan.id}</InlineCode> - {plan.displayName} ({plan.weeksInterval} semanas)
                        </Text>
                      ))}
                    </BlockStack>
                  </Banner>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Configuración de Milestones */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <div>
                <Text variant="headingLg" as="h2">
                  Configuración de Milestones de Descuento
                </Text>
                <Text variant="bodyMd" color="subdued">
                  Configura las metas de productos y descuentos que aparecerán en la barra de progreso
                </Text>
              </div>

              <Form onSubmit={handleSubmit}>
                <FormLayout>
                  <FormLayout.Group>
                    <div>
                      <Text variant="headingMd" as="h3">
                        Milestone 1
                      </Text>
                      <BlockStack gap="300">
                        <TextField
                          label="Cantidad de productos"
                          type="number"
                          value={formData.milestone1Items}
                          onChange={handleInputChange('milestone1Items')}
                          helpText="Número de productos para alcanzar el primer descuento"
                        />
                        <TextField
                          label="Descuento (%)"
                          type="number"
                          value={formData.milestone1Discount}
                          onChange={handleInputChange('milestone1Discount')}
                          helpText="Porcentaje de descuento para el primer milestone"
                        />
                        <Text variant="headingSm" as="h4">Selling Plan IDs - Milestone 1</Text>
                        <TextField
                          label="2 semanas"
                          value={formData.milestone1_2weeks}
                          onChange={handleInputChange('milestone1_2weeks')}
                          helpText="ID del plan de suscripción para entrega cada 2 semanas"
                        />
                        <TextField
                          label="4 semanas"
                          value={formData.milestone1_4weeks}
                          onChange={handleInputChange('milestone1_4weeks')}
                          helpText="ID del plan de suscripción para entrega cada 4 semanas"
                        />
                        <TextField
                          label="6 semanas"
                          value={formData.milestone1_6weeks}
                          onChange={handleInputChange('milestone1_6weeks')}
                          helpText="ID del plan de suscripción para entrega cada 6 semanas"
                        />
                      </BlockStack>
                    </div>

                    <div>
                      <Text variant="headingMd" as="h3">
                        Milestone 2
                      </Text>
                      <BlockStack gap="300">
                        <TextField
                          label="Cantidad de productos"
                          type="number"
                          value={formData.milestone2Items}
                          onChange={handleInputChange('milestone2Items')}
                          helpText="Número de productos para alcanzar el segundo descuento (debe ser mayor que Milestone 1)"
                        />
                        <TextField
                          label="Descuento (%)"
                          type="number"
                          value={formData.milestone2Discount}
                          onChange={handleInputChange('milestone2Discount')}
                          helpText="Porcentaje de descuento para el segundo milestone"
                        />
                        <Text variant="headingSm" as="h4">Selling Plan IDs - Milestone 2</Text>
                        <TextField
                          label="2 semanas"
                          value={formData.milestone2_2weeks}
                          onChange={handleInputChange('milestone2_2weeks')}
                          helpText="ID del plan de suscripción para entrega cada 2 semanas"
                        />
                        <TextField
                          label="4 semanas"
                          value={formData.milestone2_4weeks}
                          onChange={handleInputChange('milestone2_4weeks')}
                          helpText="ID del plan de suscripción para entrega cada 4 semanas"
                        />
                        <TextField
                          label="6 semanas"
                          value={formData.milestone2_6weeks}
                          onChange={handleInputChange('milestone2_6weeks')}
                          helpText="ID del plan de suscripción para entrega cada 6 semanas"
                        />
                      </BlockStack>
                    </div>
                  </FormLayout.Group>

                  <Button
                    primary
                    loading={isLoading}
                    onClick={handleSubmit}
                  >
                    Guardar Configuración
                  </Button>
                </FormLayout>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}