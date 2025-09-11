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
  InlineCode
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const prisma = (await import("../db.server")).default;
  const { session } = await authenticate.admin(request);
  
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

  return { config };
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
  const { config } = useLoaderData();
  const fetcher = useFetcher();
  const [showToast, setShowToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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