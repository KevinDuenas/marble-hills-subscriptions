import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Banner,
  Text,
  BlockStack,
  InlineCode,
  List
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

export default function ProductSetupPage() {
  const { shop } = useLoaderData();

  return (
    <Page>
      <TitleBar title="Configuring Products" />
      <Layout>
        {/* Banner informativo */}
        <Layout.Section>
          <Banner title="Configuración de Productos para Suscripción" status="info">
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

              <BlockStack gap="300">
                <div>
                  <Text variant="headingMd" color="text-success">Tag Requerido:</Text>
                  <div style={{ marginTop: '8px' }}>
                    <InlineCode>sb-subscription</InlineCode>
                  </div>
                  <Text variant="bodyMd" color="subdued" style={{ marginTop: '8px' }}>
                    <strong>Importante:</strong> Sin este tag, los productos NO aparecerán 
                    en el formulario de suscripción.
                  </Text>
                </div>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Sistema de Categorías */}
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

              <BlockStack gap="300">
                <div>
                  <Text variant="headingMd" color="text-info">Formato de Tags de Categoría:</Text>
                  <div style={{ marginTop: '8px' }}>
                    <InlineCode>sb-category-[NombreCategoria]</InlineCode> o <InlineCode>sb-category-[NombreCategoria]-#[Posición]</InlineCode>
                  </div>
                </div>

                <div>
                  <Text variant="headingSm">Características:</Text>
                  <List type="bullet">
                    <List.Item><strong>Dinámico:</strong> Las categorías se crean automáticamente</List.Item>
                    <List.Item><strong>Ordenamiento:</strong> Usa <InlineCode>-#[número]</InlineCode> para controlar el orden (ej: <InlineCode>-#1</InlineCode> aparece primero)</List.Item>
                    <List.Item><strong>Case-sensitive:</strong> <InlineCode>sb-category-Steak</InlineCode> ≠ <InlineCode>sb-category-steak</InlineCode></List.Item>
                    <List.Item><strong>Auto-formato:</strong> Los nombres se formatean automáticamente (mayúsculas, espacios)</List.Item>
                    <List.Item><strong>Múltiples categorías:</strong> Un producto puede tener varios tags <InlineCode>sb-category-</InlineCode></List.Item>
                  </List>
                </div>

                <div>
                  <Text variant="headingSm">Ejemplo con Ordenamiento:</Text>
                  <div style={{ marginTop: '8px' }}>
                    Un producto con estos tags:
                  </div>
                  <div style={{ marginTop: '8px', marginLeft: '16px' }}>
                    • <InlineCode>sb-subscription</InlineCode><br/>
                    • <InlineCode>sb-category-Steaks-#1</InlineCode><br/>
                    • <InlineCode>sb-category-Premium-#3</InlineCode><br/>
                    • <InlineCode>sb-category-BBQ</InlineCode><br/>
                    • <InlineCode>sb-best-seller</InlineCode>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <strong>Resultado:</strong> El producto aparecerá en 4 categorías<br/>
                    <strong>Orden de aparición:</strong> Best Sellers → Steaks → Premium → BBQ
                  </div>
                </div>
              </BlockStack>
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
                <div>
                  <Text variant="headingMd">Ordenamiento de Categorías</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Text variant="bodyMd">
                      Controla el orden en que aparecen las categorías usando números de posición:
                    </Text>
                    <List type="bullet" style={{ marginTop: '8px' }}>
                      <List.Item><strong>Best Sellers:</strong> Siempre aparece primero (si tiene productos)</List.Item>
                      <List.Item><strong>Categorías con posición:</strong> <InlineCode>-#1</InlineCode>, <InlineCode>-#2</InlineCode>, etc. aparecen en orden ascendente</List.Item>
                      <List.Item><strong>Categorías sin posición:</strong> Aparecen al final (posición 999)</List.Item>
                    </List>
                  </div>
                </div>

                <div>
                  <Text variant="headingMd">Best Sellers</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Text variant="bodyMd">
                      Los productos con este tag aparecen en la categoría "Best Sellers"
                      (se muestra primera cuando tiene productos):
                    </Text>
                    <div style={{ marginTop: '8px' }}>
                      <InlineCode>sb-best-seller</InlineCode>
                    </div>
                  </div>
                </div>

                <div>
                  <Text variant="headingMd">One-Time Offers</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Text variant="bodyMd">
                      Los productos con este tag aparecen en el Paso 3 (One-Time Offers):
                    </Text>
                    <div style={{ marginTop: '8px' }}>
                      <InlineCode>sb-one-time-offer</InlineCode>
                    </div>
                  </div>
                </div>
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
                <div>
                  <Text variant="headingSm">1. Habilitar productos para suscripción</Text>
                  <Text variant="bodyMd">
                    Añade el tag <InlineCode>sb-subscription</InlineCode> a todos los productos 
                    que quieras que aparezcan en el formulario de suscripción.
                  </Text>
                </div>

                <div>
                  <Text variant="headingSm">2. Crear categorías con orden</Text>
                  <Text variant="bodyMd">
                    Añade tags <InlineCode>sb-category-[Nombre]</InlineCode> o <InlineCode>sb-category-[Nombre]-#[Posición]</InlineCode> para crear
                    las categorías que desees. Usa <InlineCode>-#1</InlineCode>, <InlineCode>-#2</InlineCode>, etc. para controlar el orden de aparición.
                    Los productos pueden estar en múltiples categorías.
                  </Text>
                </div>

                <div>
                  <Text variant="headingSm">3. Marcar best sellers (opcional)</Text>
                  <Text variant="bodyMd">
                    Añade el tag <InlineCode>sb-best-seller</InlineCode> a los productos más populares 
                    para que aparezcan en la categoría especial "Best Sellers".
                  </Text>
                </div>

                <div>
                  <Text variant="headingSm">4. Configurar ofertas especiales (opcional)</Text>
                  <Text variant="bodyMd">
                    Añade <InlineCode>sb-one-time-offer</InlineCode> a productos que quieras 
                    mostrar como ofertas especiales en el último paso.
                  </Text>
                </div>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Notas Técnicas */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Notas Técnicas</Text>
              <List type="bullet">
                <List.Item>
                  <strong>Prefijo obligatorio:</strong> Todos los tags deben usar el prefijo <InlineCode>sb-</InlineCode>
                </List.Item>
                <List.Item>
                  <strong>Sin conflictos:</strong> El prefijo <InlineCode>sb-</InlineCode> evita interferencias con otros tags de la tienda
                </List.Item>
                <List.Item>
                  <strong>API automática:</strong> El sistema busca primero en <InlineCode>/collections/subscriptions/products.json</InlineCode>
                </List.Item>
                <List.Item>
                  <strong>Fallback graceful:</strong> Si no hay colección de suscripciones, el sistema busca en todos los productos
                </List.Item>
                <List.Item>
                  <strong>Productos sin categoría:</strong> Van automáticamente a "Best Sellers" si no tienen tags <InlineCode>sb-category-</InlineCode>
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}