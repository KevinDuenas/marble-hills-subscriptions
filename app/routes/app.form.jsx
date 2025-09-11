import {
  Card,
  Page,
  Banner,
  Layout,
  Text,
  BlockStack,
  Box,
  Badge,
  Divider,
  List,
  InlineCode,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function SubscriptionTagsPage() {
  return (
    <Page>
      <TitleBar title="Product Setup for Subscriptions" />
      <Layout>
        {/* Banner informativo */}
        <Layout.Section>
          <Banner title="Configuración de Tags para Suscripciones" status="info">
            <p>
              Configura los tags de tus productos para que aparezcan correctamente 
              en el formulario de suscripción. Todos los tags usan el prefijo <InlineCode>sb-</InlineCode> 
              para evitar conflictos con otros tags de la tienda.
            </p>
          </Banner>
        </Layout.Section>

        {/* Tags de Elegibilidad */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <div>
                <Text variant="headingLg" as="h2">
                  Tag de Elegibilidad para Suscripción
                </Text>
                <Text variant="bodyMd" color="subdued">
                  Los productos DEBEN tener este tag para aparecer 
                  en el formulario de suscripción
                </Text>
              </div>
              
              <Box padding="300" background="bg-surface-success-subdued" borderRadius="200">
                <BlockStack gap="200">
                  <Text variant="headingMd" color="text-success">Tag Requerido:</Text>
                  <Text variant="bodyLg" style={{fontSize: "18px", fontWeight: "600"}}>
                    <InlineCode>sb-subscription</InlineCode>
                  </Text>
                  <Text variant="bodyMd" color="text-success">
                    <strong>Importante:</strong> Sin este tag, los productos NO aparecerán 
                    en el formulario de suscripción.
                  </Text>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Sistema de Categorías Dinámicas */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <div>
                <Text variant="headingLg" as="h2">
                  Sistema de Categorías Dinámicas
                </Text>
                <Text variant="bodyMd" color="subdued">
                  Las categorías se crean automáticamente basadas en los tags de los productos
                </Text>
              </div>

              <Box padding="300" background="bg-surface-info-subdued" borderRadius="200">
                <BlockStack gap="300">
                  <Text variant="headingMd" color="text-info">Formato de Tags de Categoría:</Text>
                  <Text variant="bodyLg"><InlineCode>sb-category-[NombreCategoria]</InlineCode></Text>
                  
                  <Divider />
                  
                  <Text variant="headingMd" color="text-info">Ejemplos:</Text>
                  <List type="bullet">
                    <List.Item><InlineCode>sb-category-Steaks</InlineCode> → Crea categoría "Steaks"</List.Item>
                    <List.Item><InlineCode>sb-category-Premium-Cuts</InlineCode> → Crea categoría "Premium Cuts"</List.Item>
                    <List.Item><InlineCode>sb-category-chicken_wings</InlineCode> → Crea categoría "Chicken Wings"</List.Item>
                    <List.Item><InlineCode>sb-category-BBQ</InlineCode> → Crea categoría "BBQ"</List.Item>
                  </List>

                  <Divider />

                  <Text variant="headingMd" color="text-info">Características Importantes:</Text>
                  <List type="bullet">
                    <List.Item><strong>Sensible a mayúsculas:</strong> <InlineCode>sb-category-Steak</InlineCode> ≠ <InlineCode>sb-category-steak</InlineCode></List.Item>
                    <List.Item><strong>Múltiples categorías:</strong> Un producto puede tener varios tags <InlineCode>sb-category-</InlineCode></List.Item>
                    <List.Item><strong>Auto-formato:</strong> Guiones y guiones bajos se convierten en espacios</List.Item>
                    <List.Item><strong>Creación automática:</strong> No necesitas configurar categorías previamente</List.Item>
                  </List>
                </BlockStack>
              </Box>

              <Box padding="300" background="bg-surface-warning-subdued" borderRadius="200">
                <BlockStack gap="200">
                  <Text variant="headingMd" color="text-warning">Ejemplo de Producto con Múltiples Categorías:</Text>
                  <Text variant="bodyMd">
                    Un producto con estos tags:
                  </Text>
                  <List type="bullet">
                    <List.Item><InlineCode>sb-subscription</InlineCode> (eligibilidad)</List.Item>
                    <List.Item><InlineCode>sb-category-Steaks</InlineCode></List.Item>
                    <List.Item><InlineCode>sb-category-Premium</InlineCode></List.Item>
                    <List.Item><InlineCode>sb-category-BBQ</InlineCode></List.Item>
                    <List.Item><InlineCode>sb-best-seller</InlineCode></List.Item>
                  </List>
                  <Text variant="bodyMd" color="text-warning">
                    <strong>Resultado:</strong> El producto aparecerá en 4 categorías: Steaks, Premium, BBQ y Best Sellers
                  </Text>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Tags Especiales */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <div>
                <Text variant="headingLg" as="h2">
                  Tags Especiales
                </Text>
                <Text variant="bodyMd" color="subdued">
                  Tags adicionales para funcionalidades específicas
                </Text>
              </div>

              <BlockStack gap="300">
                {/* Best Sellers */}
                <Box padding="300" background="bg-surface-tertiary" borderRadius="200">
                  <BlockStack gap="200">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Text variant="headingMd">Best Sellers</Text>
                      <Badge tone="attention">Categoría Especial</Badge>
                    </div>
                    <Text variant="bodyMd">
                      Los productos con este tag aparecen en la categoría "Best Sellers" 
                      (se muestra primera cuando tiene productos):
                    </Text>
                    <Text variant="bodyLg" style={{fontSize: "16px", fontWeight: "600", marginTop: "8px"}}>
                      <InlineCode>sb-best-seller</InlineCode>
                    </Text>
                  </BlockStack>
                </Box>

                {/* One-Time Offers */}
                <Box padding="300" background="bg-surface-tertiary" borderRadius="200">
                  <BlockStack gap="200">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Text variant="headingMd">Ofertas de Una Sola Vez</Text>
                      <Badge tone="info">Paso 3</Badge>
                    </div>
                    <Text variant="bodyMd">
                      Los productos con este tag aparecen en el Paso 3 (One-Time Offers):
                    </Text>
                    <List type="bullet">
                      <List.Item><InlineCode>sb-one-time-offer</InlineCode></List.Item>
                    </List>
                  </BlockStack>
                </Box>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Guía de Implementación */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <div>
                <Text variant="headingLg" as="h2">
                  Guía de Implementación
                </Text>
                <Text variant="bodyMd" color="subdued">
                  Pasos para configurar correctamente los tags de tus productos
                </Text>
              </div>

              <BlockStack gap="300">
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="headingMd">Paso 1: Eligibilidad</Text>
                    <Text variant="bodyMd">
                      Añade el tag <InlineCode>sb-subscription</InlineCode> a todos los productos 
                      que quieras que aparezcan en el formulario de suscripción.
                    </Text>
                  </BlockStack>
                </Box>

                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="headingMd">Paso 2: Categorización</Text>
                    <Text variant="bodyMd">
                      Añade tags <InlineCode>sb-category-[Nombre]</InlineCode> para crear 
                      las categorías que desees. Los productos pueden estar en múltiples categorías.
                    </Text>
                  </BlockStack>
                </Box>

                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="headingMd">Paso 3: Best Sellers (Opcional)</Text>
                    <Text variant="bodyMd">
                      Añade el tag <InlineCode>sb-best-seller</InlineCode> a los productos más populares 
                      para que aparezcan en la categoría especial "Best Sellers".
                    </Text>
                  </BlockStack>
                </Box>

                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="headingMd">Paso 4: Ofertas Especiales (Opcional)</Text>
                    <Text variant="bodyMd">
                      Añade <InlineCode>sb-one-time-offer</InlineCode> a productos que quieras 
                      ofrecer como complementos en el Paso 3 del formulario.
                    </Text>
                  </BlockStack>
                </Box>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Notas Técnicas */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <div>
                <Text variant="headingLg" as="h2">
                  Notas Técnicas Importantes
                </Text>
              </div>

              <Box padding="300" background="bg-surface-caution-subdued" borderRadius="200">
                <BlockStack gap="200">
                  <Text variant="headingMd" color="text-caution">⚠️ Puntos Importantes:</Text>
                  <List type="bullet">
                    <List.Item>
                      <strong>Prefijo obligatorio:</strong> Todos los tags deben usar el prefijo <InlineCode>sb-</InlineCode>
                    </List.Item>
                    <List.Item>
                      <strong>Sin conflictos:</strong> El prefijo <InlineCode>sb-</InlineCode> evita interferencias con otros tags de la tienda
                    </List.Item>
                    <List.Item>
                      <strong>Case sensitive:</strong> <InlineCode>sb-category-Beef</InlineCode> y <InlineCode>sb-category-beef</InlineCode> son diferentes
                    </List.Item>
                    <List.Item>
                      <strong>Fallback graceful:</strong> Si no hay colección de suscripciones, el sistema busca en todos los productos
                    </List.Item>
                    <List.Item>
                      <strong>Productos sin categoría:</strong> Van automáticamente a "Best Sellers" si no tienen tags <InlineCode>sb-category-</InlineCode>
                    </List.Item>
                  </List>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
