// web/frontend/pages/FormularioPage.jsx
import { useState, useCallback } from "react";
import pkg from "@shopify/polaris";
//import { useAppQuery, useAuthenticatedFetch } from "../hooks";

const {
  Card,
  Page,
  Form,
  FormLayout,
  TextField,
  Button,
  Banner,
  Layout,
  Text,
  Divider,
  TextContainer,
  Badge,
  Stack,
} = pkg;

export default function FormularioPage() {
  //const fetch = useAuthenticatedFetch();
  //const [toastProps, setToastProps] = useState({ show: false });
  const [saving, setSaving] = useState(false);

  // Cargar contenido actual del formulario
  // const {
  //   data: formularioData,
  //   isLoading,
  //   refetch,
  // } = useAppQuery({
  //   url: "/api/formulario-content",
  //   reactQueryOptions: {
  //     onSuccess: (data) => {
  //       if (data) {
  //         setFormData(data);
  //       }
  //     },
  //   },
  // });

  // Estado del formulario con valores por defecto
  const [formData, setFormData] = useState({
    // Paso 1 - Planes
    planesTitle: "Elige tu plan perfecto",
    planesCuradosTitle: "Planes Curados",
    planesCuradosDescription:
      "Planes diseñados por expertos para diferentes tipos de viaje",
    planesCuradosFeatures:
      "✓ Itinerarios optimizados\n✓ Recomendaciones locales\n✓ Soporte 24/7",
    planesCuradosButtonText: "Ver Planes Curados",

    planesCustomizadosTitle: "Planes Customizados",
    planesCustomizadosDescription:
      "Crea tu propio itinerario personalizado según tus preferencias",
    planesCustomizadosFeatures:
      "✓ 100% personalizable\n✓ Asesoría especializada\n✓ Modificaciones ilimitadas",
    planesCustomizadosButtonText: "Crear Plan Personalizado",

    // Configuraciones adicionales
    mostrarPaso1: true,
    colorPrimario: "#007ace",
    colorSecundario: "#f8f9fa",
  });

  const handleInputChange = useCallback(
    (field) => (value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // const handleSubmit = useCallback(async () => {
  //   setSaving(true);
  //   try {
  //     const response = await fetch("/api/formulario-content", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(formData),
  //     });

  //     if (response.ok) {
  //       const result = await response.json();
  //       // setToastProps({
  //       //   show: true,
  //       //   message: "Contenido guardado exitosamente",
  //       //   error: false,
  //       // });
  //       // refetch();
  //     } else {
  //       throw new Error("Error al guardar");
  //     }
  //   } catch (error) {
  //     // setToastProps({
  //     //   show: true,
  //     //   message: "Error al guardar el contenido",
  //     //   error: true,
  //     // });
  //   } finally {
  //     setSaving(false);
  //   }
  // }, [formData, fetch, refetch]);

  const handlePreview = useCallback(() => {
    // Abrir preview del theme con los cambios
    const previewUrl = `https://${window.location.hostname.replace("admin", "")}/pages/preview-formulario`;
    window.open(previewUrl, "_blank");
  }, []);

  //if (isLoading) return <div>Cargando contenido del formulario...</div>;

  return (
    <Page
      title="Formulario"
      subtitle="Edita el contenido que aparecerá en tu tienda"
      primaryAction={{
        content: saving ? "Guardando..." : "Guardar Cambios",
        //onAction: handleSubmit,
        loading: saving,
      }}
      secondaryActions={[
        {
          content: "Vista Previa",
          onAction: handlePreview,
          external: true,
        },
      ]}
    >
      {/* {toastProps.show && (
        <Toast
          content={toastProps.message}
          error={toastProps.error}
          onDismiss={() => setToastProps({ show: false })}
        />
      )} */}

      <Layout>
        {/* Banner informativo */}
        <Layout.Section>
          <Banner title="Editor de Contenido" status="info">
            <p>
              Edita aquí todo el texto que aparecerá en tu formulario de la
              tienda. Los cambios se aplicarán automáticamente en el theme.
            </p>
          </Banner>
        </Layout.Section>

        {/* Paso 1: Configuración de Planes */}
        <Layout.Section>
          <Card>
            <div style={{ padding: "20px" }}>
              <Stack vertical spacing="loose">
                <div>
                  <Text variant="headingLg" as="h2">
                    Paso 1: Selección de Planes
                  </Text>
                  <Text variant="bodyMd" color="subdued">
                    Configura el contenido de las tarjetas de planes
                  </Text>
                </div>

                {/* <Form onSubmit={handleSubmit}> */}
                <Form>
                  <FormLayout>
                    {/* Título principal del paso */}
                    <TextField
                      label="Título principal del paso"
                      value={formData.planesTitle}
                      onChange={handleInputChange("planesTitle")}
                      helpText="Título que aparece arriba de las tarjetas de planes"
                    />

                    <Divider />

                    {/* Planes Curados */}
                    <div>
                      <Text variant="headingMd" as="h3" color="success">
                        Tarjeta: Planes Curados
                      </Text>
                      <div style={{ marginTop: "15px" }}>
                        <FormLayout>
                          <TextField
                            label="Título de la tarjeta"
                            value={formData.planesCuradosTitle}
                            onChange={handleInputChange("planesCuradosTitle")}
                          />

                          <TextField
                            label="Descripción"
                            value={formData.planesCuradosDescription}
                            onChange={handleInputChange(
                              "planesCuradosDescription",
                            )}
                            multiline={3}
                            helpText="Descripción que explica qué son los planes curados"
                          />

                          <TextField
                            label="Características (una por línea)"
                            value={formData.planesCuradosFeatures}
                            onChange={handleInputChange(
                              "planesCuradosFeatures",
                            )}
                            multiline={4}
                            helpText="Lista de características, separadas por saltos de línea"
                          />

                          <TextField
                            label="Texto del botón"
                            value={formData.planesCuradosButtonText}
                            onChange={handleInputChange(
                              "planesCuradosButtonText",
                            )}
                          />
                        </FormLayout>
                      </div>
                    </div>

                    <Divider />

                    {/* Planes Customizados */}
                    <div>
                      <Text variant="headingMd" as="h3" color="warning">
                        Tarjeta: Planes Customizados
                      </Text>
                      <div style={{ marginTop: "15px" }}>
                        <FormLayout>
                          <TextField
                            label="Título de la tarjeta"
                            value={formData.planesCustomizadosTitle}
                            onChange={handleInputChange(
                              "planesCustomizadosTitle",
                            )}
                          />

                          <TextField
                            label="Descripción"
                            value={formData.planesCustomizadosDescription}
                            onChange={handleInputChange(
                              "planesCustomizadosDescription",
                            )}
                            multiline={3}
                            helpText="Descripción que explica qué son los planes customizados"
                          />

                          <TextField
                            label="Características (una por línea)"
                            value={formData.planesCustomizadosFeatures}
                            onChange={handleInputChange(
                              "planesCustomizadosFeatures",
                            )}
                            multiline={4}
                            helpText="Lista de características, separadas por saltos de línea"
                          />

                          <TextField
                            label="Texto del botón"
                            value={formData.planesCustomizadosButtonText}
                            onChange={handleInputChange(
                              "planesCustomizadosButtonText",
                            )}
                          />
                        </FormLayout>
                      </div>
                    </div>

                    <Divider />

                    {/* Configuraciones de estilo */}
                    <div>
                      <Text variant="headingMd" as="h3">
                        Configuraciones de Estilo
                      </Text>
                      <div style={{ marginTop: "15px" }}>
                        <FormLayout>
                          <TextField
                            label="Color primario (hex)"
                            value={formData.colorPrimario}
                            onChange={handleInputChange("colorPrimario")}
                            placeholder="#007ace"
                            prefix="#"
                          />

                          <TextField
                            label="Color secundario (hex)"
                            value={formData.colorSecundario}
                            onChange={handleInputChange("colorSecundario")}
                            placeholder="#f8f9fa"
                            prefix="#"
                          />
                        </FormLayout>
                      </div>
                    </div>
                  </FormLayout>
                </Form>
              </Stack>
            </div>
          </Card>
        </Layout.Section>

        {/* Preview del contenido */}
        <Layout.Section>
          <Card title="Vista Previa">
            <div style={{ padding: "20px" }}>
              <Text variant="headingMd" as="h3">
                {formData.planesTitle}
              </Text>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                  marginTop: "20px",
                }}
              >
                {/* Preview Planes Curados */}
                <div
                  style={{
                    border: "1px solid #e1e3e5",
                    borderRadius: "8px",
                    padding: "20px",
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  <Text variant="headingMd" as="h4" color="success">
                    {formData.planesCuradosTitle}
                  </Text>
                  <div style={{ marginTop: "10px" }}>
                    <Text variant="bodyMd">
                      {formData.planesCuradosDescription}
                    </Text>
                  </div>
                  <div style={{ marginTop: "15px" }}>
                    {formData.planesCuradosFeatures
                      .split("\n")
                      .map((feature, index) => (
                        <div key={index} style={{ marginBottom: "5px" }}>
                          <Text variant="bodyMd">{feature}</Text>
                        </div>
                      ))}
                  </div>
                  <div style={{ marginTop: "15px" }}>
                    <Button size="medium" primary>
                      {formData.planesCuradosButtonText}
                    </Button>
                  </div>
                </div>

                {/* Preview Planes Customizados */}
                <div
                  style={{
                    border: "1px solid #e1e3e5",
                    borderRadius: "8px",
                    padding: "20px",
                    backgroundColor: "#fff9e6",
                  }}
                >
                  <Text variant="headingMd" as="h4" color="warning">
                    {formData.planesCustomizadosTitle}
                  </Text>
                  <div style={{ marginTop: "10px" }}>
                    <Text variant="bodyMd">
                      {formData.planesCustomizadosDescription}
                    </Text>
                  </div>
                  <div style={{ marginTop: "15px" }}>
                    {formData.planesCustomizadosFeatures
                      .split("\n")
                      .map((feature, index) => (
                        <div key={index} style={{ marginBottom: "5px" }}>
                          <Text variant="bodyMd">{feature}</Text>
                        </div>
                      ))}
                  </div>
                  <div style={{ marginTop: "15px" }}>
                    <Button size="medium">
                      {formData.planesCustomizadosButtonText}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Layout.Section>

        {/* Estadísticas de uso */}
        <Layout.Section>
          <Card title="Estadísticas" sectioned>
            <Stack distribution="fillEvenly">
              <TextContainer>
                <Text variant="headingMd">Vistas del formulario</Text>
                <Text variant="headingLg">1,234</Text>
                <Badge status="success">+12% esta semana</Badge>
              </TextContainer>

              <TextContainer>
                <Text variant="headingMd">Planes curados seleccionados</Text>
                <Text variant="headingLg">456</Text>
                <Badge status="info">68% del total</Badge>
              </TextContainer>

              <TextContainer>
                <Text variant="headingMd">Planes customizados</Text>
                <Text variant="headingLg">218</Text>
                <Badge status="warning">32% del total</Badge>
              </TextContainer>
            </Stack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
