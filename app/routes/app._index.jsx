import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  List,
  Link,
  InlineStack,
  Banner,
  InlineCode,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  return (
    <Page>
      <TitleBar title="Marble Hills Subscription App" />
      <BlockStack gap="500">
        <Banner
          title="Marble Hills Subscription Management"
          status="success"
        >
          <p>
            Welcome to your subscription management app. This app allows customers to create 
            custom subscription boxes with dynamic milestone-based discounts.
          </p>
          <p>
            <strong>Requirements:</strong> This app requires the official Shopify Subscriptions app 
            to be installed and configured in your store to handle subscription billing and management.
          </p>
        </Banner>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  🎯 How It Works
                </Text>
                <Text variant="bodyMd" as="p">
                  Your customers can build custom subscription boxes by selecting products from categorized grids. 
                  As they add more products, they unlock milestone discounts that appear in a progress bar. 
                  The subscription form is a 3-step process with product selection, frequency choice, and optional one-time offers.
                </Text>
                
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">
                    Customer Flow:
                  </Text>
                  <List type="number">
                    <List.Item><strong>Step 1:</strong> Select products from dynamic categories</List.Item>
                    <List.Item><strong>Step 2:</strong> Choose delivery frequency (2, 4, or 6 weeks)</List.Item>
                    <List.Item><strong>Step 3:</strong> Optional one-time offers and email capture</List.Item>
                  </List>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    ⚙️ Configuration Steps
                  </Text>
                  <List>
                    <List.Item>
                      <Text as="span" variant="headingSm">
                        1. Product Setup
                      </Text>
                      <Text variant="bodyMd" color="subdued">
                        Configure product tags using the <InlineCode>sb-</InlineCode> prefix system. 
                        Use the "Product Setup" menu item above.
                      </Text>
                    </List.Item>
                    <List.Item>
                      <Text as="span" variant="headingSm">
                        2. Milestone Configuration
                      </Text>
                      <Text variant="bodyMd" color="subdued">
                        Set up discount milestones and Selling Plan IDs. 
                        Use the "Milestone Configuration" menu item above.
                      </Text>
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    🏷️ Tag System
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Eligibility
                      </Text>
                      <InlineCode>sb-subscription</InlineCode>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Categories
                      </Text>
                      <InlineCode>sb-category-[Name]</InlineCode>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Best Sellers
                      </Text>
                      <InlineCode>sb-best-seller</InlineCode>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        One-Time Offers
                      </Text>
                      <InlineCode>sb-one-time-offer</InlineCode>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>

      </BlockStack>
    </Page>
  );
}
