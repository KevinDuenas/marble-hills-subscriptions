console.log("Subscription form JS loaded");

document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded");

  // Buscar específicamente el contenedor del formulario de suscripción
  let form = document.querySelector(".subscription-builder");

  if (!form) {
    console.log("Trying to find subscription form by content...");
    // Buscar por el indicador de pasos que es único
    const stepIndicator = document.querySelector(".step-indicator");
    if (stepIndicator) {
      form = stepIndicator.closest("div") || stepIndicator.parentElement;
      console.log("Found form via step indicator:", form);
    }
  }

  if (!form) {
    // Buscar por los form-steps
    const formStep = document.querySelector(".form-step");
    if (formStep) {
      form = formStep.closest("div") || formStep.parentElement;
      console.log("Found form via form-step:", form);
    }
  }

  if (!form) {
    console.error("Could not find subscription form container");
    return;
  }

  console.log("Using form container:", form);

  let subscriptionData = {};
  let selectedProducts = []; // Array de {id, title, image, quantity}
  const DISCOUNT_THRESHOLDS = {
    6: 5, // 6 productos = 5% descuento
    10: 10, // 10 productos = 10% descuento
  };

  // Navegación entre pasos
  function showStep(stepNumber) {
    console.log("Showing step:", stepNumber);

    // Buscar pasos en todo el documento
    const allSteps = document.querySelectorAll(".form-step");
    console.log("All form steps found:", allSteps.length);

    // Ocultar todos los pasos
    allSteps.forEach((step, index) => {
      step.classList.remove("active");
      step.style.display = "none";
    });

    // Mostrar paso actual
    const currentStep = document.querySelector(
      `.form-step[data-step="${stepNumber}"]`,
    );
    if (currentStep) {
      currentStep.classList.add("active");
      currentStep.style.display = "block";
      console.log("Activated step:", stepNumber, currentStep);
    } else {
      console.error("Step not found:", stepNumber);
    }

    // Actualizar indicador de pasos
    updateStepIndicator(stepNumber);
  }

  // Actualizar indicador de pasos según el tipo de suscripción
  function updateStepIndicator(currentStep) {
    const stepIndicators = document.querySelectorAll(".step");
    const subscriptionType = document.querySelector(
      'input[name="subscription_type"]:checked',
    )?.value;

    if (subscriptionType === "custom") {
      // Para Custom Box: ocultar paso 2 (tamaño de caja)
      stepIndicators[1]?.classList.add("hidden");

      // Renumerar los pasos visibles
      let visibleIndex = 1;
      stepIndicators.forEach((indicator, index) => {
        if (index === 1) return; // Skip step 2

        indicator.textContent = visibleIndex;
        if (
          visibleIndex <= currentStep ||
          (index === 2 && currentStep === 3) ||
          (index === 3 && currentStep === 4)
        ) {
          indicator.classList.add("active");
        } else {
          indicator.classList.remove("active");
        }
        visibleIndex++;
      });
    } else {
      // Para Curated Box: mostrar todos los pasos excepto el 4
      stepIndicators.forEach((indicator, index) => {
        indicator.classList.remove("hidden");
        indicator.textContent = index + 1;

        if (index + 1 <= currentStep) {
          indicator.classList.add("active");
        } else {
          indicator.classList.remove("active");
        }
      });

      // Ocultar paso 4 para Curated
      if (subscriptionType === "curated") {
        stepIndicators[3]?.classList.add("hidden");
      }
    }
  }

  // Validar paso actual
  function validateCurrentStep(stepNumber) {
    const subscriptionType = document.querySelector(
      'input[name="subscription_type"]:checked',
    )?.value;

    if (stepNumber === 1) {
      if (!subscriptionType) {
        alert("Por favor selecciona un tipo de suscripción");
        return false;
      }
    }

    if (stepNumber === 2 && subscriptionType === "curated") {
      const selectedSize = document.querySelector(
        'input[name="box_size"]:checked',
      );
      if (!selectedSize) {
        alert("Por favor selecciona un tamaño de caja");
        return false;
      }
    }

    if (stepNumber === 3) {
      const selectedFreq = document.querySelector(
        'input[name="frequency"]:checked',
      );
      if (!selectedFreq) {
        alert("Por favor selecciona una frecuencia");
        return false;
      }
    }

    if (stepNumber === 4 && subscriptionType === "custom") {
      if (selectedProducts.length === 0) {
        alert("Por favor selecciona al menos un producto");
        return false;
      }
    }

    return true;
  }

  // Event listeners para navegación
  function initializeButtons() {
    console.log("Initializing buttons");

    // Buscar botones en todo el documento
    const nextButtons = document.querySelectorAll(".next-step");
    console.log("Next buttons found:", nextButtons.length);

    nextButtons.forEach((button, index) => {
      console.log("Adding listener to next button", index);

      // Remover listeners anteriores
      button.replaceWith(button.cloneNode(true));
      const newButton = document.querySelectorAll(".next-step")[index];

      newButton.addEventListener("click", function (e) {
        e.preventDefault();
        console.log("Next button clicked");

        const currentStep = parseInt(this.closest(".form-step").dataset.step);
        const subscriptionType = document.querySelector(
          'input[name="subscription_type"]:checked',
        )?.value;

        if (validateCurrentStep(currentStep)) {
          updateSubscriptionData();

          let nextStep = parseInt(this.dataset.next);

          // Lógica especial para Custom Box
          if (currentStep === 1 && subscriptionType === "custom") {
            // Saltar paso 2, ir directo a paso 3 (frecuencia)
            nextStep = 3;
          } else if (currentStep === 3 && subscriptionType === "custom") {
            // De frecuencia ir a selección de productos
            nextStep = 4;
            // Cargar todos los productos cuando llegamos al paso 4
            showStep(nextStep);
            loadAllProducts();
            return;
          } else if (currentStep === 3 && subscriptionType === "curated") {
            // Para Curated, crear suscripción directamente
            createSubscription();
            return;
          }

          showStep(nextStep);
        }
      });
    });

    // Botones "Anterior"
    const prevButtons = document.querySelectorAll(".prev-step");
    console.log("Prev buttons found:", prevButtons.length);

    prevButtons.forEach((button, index) => {
      button.replaceWith(button.cloneNode(true));
      const newButton = document.querySelectorAll(".prev-step")[index];

      newButton.addEventListener("click", function (e) {
        e.preventDefault();
        console.log("Prev button clicked");

        const currentStep = parseInt(this.closest(".form-step").dataset.step);
        const subscriptionType = document.querySelector(
          'input[name="subscription_type"]:checked',
        )?.value;

        let prevStep = parseInt(this.dataset.prev);

        // Lógica especial para Custom Box
        if (currentStep === 3 && subscriptionType === "custom") {
          // Volver al paso 1 (saltar paso 2)
          prevStep = 1;
        } else if (currentStep === 4 && subscriptionType === "custom") {
          // Volver al paso 3 (frecuencia)
          prevStep = 3;
        }

        showStep(prevStep);
      });
    });

    // Botón crear suscripción
    const createButton = document.getElementById("create-subscription");
    if (createButton) {
      createButton.replaceWith(createButton.cloneNode(true));
      const newCreateButton = document.getElementById("create-subscription");

      newCreateButton.addEventListener("click", async function (e) {
        e.preventDefault();
        console.log("Create subscription clicked");

        if (validateCurrentStep(4)) {
          createSubscription();
        }
      });
    }
  }

  // Actualizar datos de suscripción
  function updateSubscriptionData() {
    const type = document.querySelector(
      'input[name="subscription_type"]:checked',
    )?.value;
    const boxSize = document.querySelector(
      'input[name="box_size"]:checked',
    )?.value;
    const frequency = document.querySelector(
      'input[name="frequency"]:checked',
    )?.value;

    subscriptionData = {
      type,
      boxSize: type === "custom" ? null : boxSize, // No box size for custom
      frequency,
      selectedProducts: selectedProducts,
    };

    console.log("Updated subscription data:", subscriptionData);
  }

  // Cargar TODOS los productos de la tienda organizados por colecciones
  async function loadAllProducts() {
    console.log("Loading all products...");

    const productsGrid = document.querySelector(".products-grid");
    productsGrid.innerHTML =
      '<div class="loading-products"><p>Cargando todos los productos...</p></div>';

    try {
      // Obtener todas las colecciones
      const collectionsResponse = await fetch("/collections.json");
      const collectionsData = await collectionsResponse.json();
      const collections = collectionsData.collections || [];

      // Cargar productos de todas las colecciones
      let allProducts = [];
      let productsByCollection = {};

      for (const collection of collections) {
        try {
          console.log("Loading collection:", collection.handle);
          const response = await fetch(
            `/collections/${collection.handle}/products.json`,
          );
          const data = await response.json();
          console.log("Loaded collection:", collection.handle, data);
          if (data.products && data.products.length > 0) {
            productsByCollection[collection.handle] = {
              title: collection.title,
              products: data.products,
            };
            allProducts = [...allProducts, ...data.products];
          }
        } catch (error) {
          console.warn(`Error loading collection ${collection.handle}:`, error);
        }
      }

      // Si no hay colecciones o productos, cargar productos generales
      if (allProducts.length === 0) {
        const generalResponse = await fetch("/products.json?limit=50");
        const generalData = await generalResponse.json();
        allProducts = generalData.products || [];
        productsByCollection["all"] = {
          title: "Todos los productos",
          products: allProducts,
        };
      }

      // Actualizar sidebar de categorías
      updateCategoriesSidebar(productsByCollection);

      // Mostrar la primera categoría con productos
      const firstCategoryWithProducts = Object.keys(productsByCollection)[0];
      if (firstCategoryWithProducts) {
        displayProducts(
          productsByCollection[firstCategoryWithProducts].products,
        );
      }
    } catch (error) {
      console.error("Error loading products:", error);
      productsGrid.innerHTML =
        '<div class="loading-products"><p>Error al cargar productos. Por favor intenta de nuevo.</p></div>';
    }
  }

  // Actualizar sidebar de categorías
  function updateCategoriesSidebar(productsByCollection) {
    const sidebar = document.querySelector(".categories-sidebar");

    let categoriesHTML = "";
    let isFirst = true;

    for (const [handle, data] of Object.entries(productsByCollection)) {
      const productCount = data.products.length;
      if (productCount > 0) {
        categoriesHTML += `
          <div class="category-item ${isFirst ? "active" : ""}" data-collection="${handle}">
            <span>${data.title}</span>
            <span class="category-badge">${productCount}</span>
          </div>
        `;
        isFirst = false;
      }
    }

    sidebar.innerHTML = categoriesHTML;

    // Re-attach event listeners
    initializeCategoryHandlers(productsByCollection);
  }

  // Mostrar productos
  function displayProducts(products) {
    const productsGrid = document.querySelector(".products-grid");

    if (!products || products.length === 0) {
      productsGrid.innerHTML =
        '<div class="loading-products"><p>No se encontraron productos en esta categoría.</p></div>';
      return;
    }

    const productCards = products
      .map((product) => {
        const selectedProduct = selectedProducts.find(
          (p) => p.id === product.id,
        );
        const isSelected = !!selectedProduct;
        const quantity = selectedProduct ? selectedProduct.quantity : 0;
        const imageSrc = (product.images && product.images[0]?.src) || "";

        return `
        <div class="product-card ${isSelected ? "selected" : ""} ${isSelected && quantity > 1 ? "has-quantity" : ""}" data-product-id="${product.id}">
          <div class="product-image">
            ${imageSrc ? `<img src="${imageSrc}" alt="${product.title}">` : "Sin imagen"}
          </div>
          <div class="product-title">${product.title}</div>
          <div class="product-description">${
            product.body_html?.replace(/<[^>]*>/g, "").substring(0, 100) ||
            "Descripción del producto"
          }</div>
          <div class="product-controls">
            <button class="add-to-selection" onclick="addProduct(${product.id}, '${product.title.replace(/'/g, "\\'")}', '${imageSrc}')">
              Agregar
            </button>
            <div class="quantity-controls">
              <button class="quantity-btn" onclick="updateQuantity(${product.id}, -1)">−</button>
              <span class="quantity-display">${quantity}</span>
              <button class="quantity-btn" onclick="updateQuantity(${product.id}, 1)">+</button>
            </div>
            <button class="remove-product" onclick="removeProduct(${product.id})" style="display: ${isSelected ? "block" : "none"};">
              Quitar
            </button>
          </div>
        </div>
      `;
      })
      .join("");

    productsGrid.innerHTML = productCards;
    updateDiscountProgress();
  }

  // Agregar producto
  function addProduct(productId, productTitle, productImage) {
    const existingProduct = selectedProducts.find((p) => p.id === productId);

    if (!existingProduct) {
      selectedProducts.push({
        id: productId,
        title: productTitle,
        image: productImage,
        quantity: 1,
      });

      updateProductUI(productId);
      updateCounter();
      updateDiscountProgress();
    }
  }

  // Actualizar cantidad
  function updateQuantity(productId, change) {
    const product = selectedProducts.find((p) => p.id === productId);

    if (product) {
      product.quantity += change;

      if (product.quantity <= 0) {
        removeProduct(productId);
      } else {
        updateProductUI(productId);
        updateCounter();
        updateDiscountProgress();
      }
    }
  }

  // Quitar producto
  function removeProduct(productId) {
    const index = selectedProducts.findIndex((p) => p.id === productId);

    if (index > -1) {
      selectedProducts.splice(index, 1);
      updateProductUI(productId);
      updateCounter();
      updateDiscountProgress();
    }
  }

  // Actualizar UI de un producto específico
  function updateProductUI(productId) {
    const card = document.querySelector(
      `.product-card[data-product-id="${productId}"]`,
    );
    if (!card) return;

    const product = selectedProducts.find((p) => p.id === productId);
    const isSelected = !!product;
    const quantityDisplay = card.querySelector(".quantity-display");

    if (isSelected) {
      card.classList.add("selected");
      if (product.quantity > 1) {
        card.classList.add("has-quantity");
      } else {
        card.classList.remove("has-quantity");
      }

      // Actualizar cantidad con animación
      quantityDisplay.textContent = product.quantity;
      quantityDisplay.classList.add("bounce");
      setTimeout(() => quantityDisplay.classList.remove("bounce"), 300);

      card.querySelector(".remove-product").style.display = "block";
    } else {
      card.classList.remove("selected", "has-quantity");
      card.querySelector(".remove-product").style.display = "none";
    }
  }

  // Actualizar contador y mostrar descuento
  function updateCounter() {
    const counter = document.getElementById("selected-count");
    const nextButton = document.getElementById("create-subscription");
    const discountInfo = document.getElementById("discount-info");

    // Calcular total de productos (sumando cantidades)
    const totalCount = selectedProducts.reduce(
      (sum, product) => sum + product.quantity,
      0,
    );

    if (counter) {
      counter.textContent = totalCount;
      // Animar contador
      counter.classList.add("pulse");
      setTimeout(() => counter.classList.remove("pulse"), 300);
    }

    // Calcular descuento
    let discount = 0;
    if (totalCount >= 10) {
      discount = 10;
    } else if (totalCount >= 6) {
      discount = 5;
    }

    // Mostrar información de descuento
    if (discountInfo && discount > 0) {
      discountInfo.textContent = `(${discount}% de descuento aplicado)`;
      discountInfo.style.display = "inline";
    } else if (discountInfo) {
      discountInfo.style.display = "none";
    }

    // Habilitar/deshabilitar botón
    if (nextButton) {
      nextButton.disabled = totalCount === 0;

      if (totalCount > 0) {
        nextButton.textContent = `Continuar (${totalCount} productos)`;
      } else {
        nextButton.textContent = "Selecciona productos";
      }
    }
  }

  // Actualizar barra de progreso de descuento
  function updateDiscountProgress() {
    const progressBar = document.querySelector(".discount-progress-bar");
    const milestones = document.querySelectorAll(".discount-milestone");

    const totalCount = selectedProducts.reduce(
      (sum, product) => sum + product.quantity,
      0,
    );
    const maxCount = 10;
    const percentage = Math.min((totalCount / maxCount) * 100, 100);

    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }

    // Actualizar milestones
    milestones.forEach((milestone, index) => {
      const threshold = index === 0 ? 6 : 10;
      if (totalCount >= threshold) {
        milestone.classList.add("active");
      } else {
        milestone.classList.remove("active");
      }
    });
  }

  // Inicializar handlers de categorías
  function initializeCategoryHandlers(productsByCollection) {
    document.querySelectorAll(".category-item").forEach((item) => {
      item.addEventListener("click", function () {
        // Remover active de todas las categorías
        document
          .querySelectorAll(".category-item")
          .forEach((cat) => cat.classList.remove("active"));

        // Agregar active a la seleccionada
        this.classList.add("active");

        // Mostrar productos de la colección
        const collection = this.dataset.collection;
        if (productsByCollection[collection]) {
          displayProducts(productsByCollection[collection].products);
        }
      });
    });
  }

  // Crear suscripción
  async function createSubscription() {
    try {
      // Mostrar loading
      document.querySelector(".form-step.active").style.display = "none";
      document.querySelector(".loading-state").style.display = "block";
      document.querySelector(".loading-state p").textContent =
        "Creando tu suscripción...";

      console.log("Creating subscription with data:", subscriptionData);

      // Calcular descuento para Custom Box
      let discount = 0;
      if (subscriptionData.type === "custom") {
        const totalCount = selectedProducts.reduce(
          (sum, product) => sum + product.quantity,
          0,
        );
        if (totalCount >= 10) {
          discount = 10;
        } else if (totalCount >= 6) {
          discount = 5;
        }
      }

      // Preparar items del carrito
      const cartItems = await prepareCartItems();

      // Agregar al carrito
      const cartResponse = await addToCartWithSubscription(cartItems, discount);

      if (cartResponse.success) {
        showFinalSummary(discount);

        setTimeout(() => {
          window.location.href = "/cart";
        }, 3000);
      } else {
        throw new Error(cartResponse.error || "Error al agregar al carrito");
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      alert(
        "Hubo un error al crear tu suscripción. Por favor intenta de nuevo.",
      );

      document.querySelector(".loading-state").style.display = "none";
      document.querySelector(".form-step.active").style.display = "block";
    }
  }

  // Preparar items del carrito
  async function prepareCartItems() {
    const cartItems = [];

    if (subscriptionData.type === "curated") {
      // Para cajas curadas, buscar producto bundle
      try {
        const bundleHandles = {
          small: "small-subscription-box",
          medium: "medium-subscription-box",
          big: "big-subscription-box",
        };

        const handle =
          bundleHandles[subscriptionData.boxSize] || "subscription-box";
        const variantId = await findProductByHandle(handle);

        if (variantId) {
          cartItems.push({
            id: variantId,
            quantity: 1,
            properties: {
              _subscription_type: "curated",
              _box_size: subscriptionData.boxSize,
              _frequency: subscriptionData.frequency,
            },
          });
        } else {
          // Fallback: usar primer producto disponible
          const demoVariantId = await getFirstAvailableProduct();
          cartItems.push({
            id: demoVariantId,
            quantity: 1,
            properties: {
              _subscription_type: "curated",
              _box_size: subscriptionData.boxSize,
              _frequency: subscriptionData.frequency,
              _demo_product: "true",
            },
          });
        }
      } catch (error) {
        console.error("Error finding bundle product:", error);
      }
    } else {
      // Para Custom Box, agregar todos los productos seleccionados con sus cantidades
      for (const product of selectedProducts) {
        try {
          const variantId = await getProductVariantId(product.id);

          if (variantId) {
            cartItems.push({
              id: variantId,
              quantity: product.quantity, // Usar la cantidad seleccionada
              properties: {
                _subscription_type: "custom",
                _frequency: subscriptionData.frequency,
                _product_title: product.title,
                _custom_selection: "true",
                _quantity: product.quantity.toString(),
              },
            });
          }
        } catch (error) {
          console.error(`Error preparing product ${product.id}:`, error);
        }
      }
    }

    return cartItems;
  }

  // Buscar producto por handle
  async function findProductByHandle(handle) {
    try {
      const response = await fetch(`/products/${handle}.js`);
      if (response.ok) {
        const product = await response.json();
        return product.variants[0]?.id || null;
      }
      return null;
    } catch (error) {
      console.error("Error finding product by handle:", error);
      return null;
    }
  }

  // Obtener primer producto disponible
  async function getFirstAvailableProduct() {
    try {
      const response = await fetch("/products.json?limit=1");
      const data = await response.json();

      if (data.products && data.products.length > 0) {
        return data.products[0].variants[0].id;
      }

      return null;
    } catch (error) {
      console.error("Error getting demo product:", error);
      return null;
    }
  }

  // Obtener variant ID
  async function getProductVariantId(productId) {
    try {
      // Intentar obtener el producto por su handle
      const response = await fetch(`/products.json?limit=250`);
      const data = await response.json();

      const product = data.products.find((p) => p.id === productId);
      if (product && product.variants.length > 0) {
        return product.variants[0].id;
      }

      return null;
    } catch (error) {
      console.error("Error getting product variant:", error);
      return null;
    }
  }

  // Agregar al carrito con suscripción
  async function addToCartWithSubscription(cartItems, discount = 0) {
    try {
      // Limpiar carrito
      await fetch("/cart/clear.js", { method: "POST" });

      // Agregar items
      const response = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cartItems,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al agregar al carrito");
      }

      const cartData = await response.json();

      // Actualizar atributos del carrito con descuento
      if (discount > 0 || subscriptionData.type === "custom") {
        const totalCount = selectedProducts.reduce(
          (sum, product) => sum + product.quantity,
          0,
        );

        await fetch("/cart/update.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attributes: {
              subscription_type: subscriptionData.type,
              frequency: subscriptionData.frequency,
              discount_percentage: discount.toString(),
              product_count: totalCount.toString(),
              unique_products: selectedProducts.length.toString(),
            },
          }),
        });
      }

      return { success: true, cart: cartData };
    } catch (error) {
      console.error("Cart error:", error);
      return { success: false, error: error.message };
    }
  }

  // Mostrar resumen final
  function showFinalSummary(discount = 0) {
    document.querySelector(".loading-state").style.display = "none";
    document.querySelector(".success-state").style.display = "block";

    const summaryContainer = document.getElementById("final-summary");

    const frequencyText = {
      "2weeks": "Cada 2 semanas",
      "4weeks": "Cada 4 semanas",
      "8weeks": "Cada 8 semanas",
      "12weeks": "Cada 12 semanas",
    };

    const boxSizeText = {
      small: "Caja Pequeña",
      medium: "Caja Mediana",
      big: "Caja Grande",
    };

    let summaryHTML = `
      <div class="summary-item">
        <strong>Tipo de Plan:</strong>
        <span>${subscriptionData.type === "curated" ? "Caja Curada" : "Caja Personalizada"}</span>
      </div>
    `;

    if (subscriptionData.type === "curated") {
      summaryHTML += `
        <div class="summary-item">
          <strong>Tamaño de Caja:</strong>
          <span>${boxSizeText[subscriptionData.boxSize] || subscriptionData.boxSize}</span>
        </div>
      `;
    }

    summaryHTML += `
      <div class="summary-item">
        <strong>Frecuencia:</strong>
        <span>${frequencyText[subscriptionData.frequency] || subscriptionData.frequency}</span>
      </div>
    `;

    if (subscriptionData.type === "custom") {
      const totalCount = selectedProducts.reduce(
        (sum, product) => sum + product.quantity,
        0,
      );
      const uniqueCount = selectedProducts.length;

      summaryHTML += `
        <div class="summary-item">
          <strong>Productos Seleccionados:</strong>
          <span>${totalCount} productos (${uniqueCount} diferentes)</span>
        </div>
      `;

      if (discount > 0) {
        summaryHTML += `
          <div class="summary-item">
            <strong>Descuento Aplicado:</strong>
            <span style="color: #28a745;">${discount}%</span>
          </div>
        `;
      }

      summaryHTML += '<div class="selected-products-list">';

      selectedProducts.forEach((product) => {
        summaryHTML += `
          <div class="selected-product-item">
            ${
              product.image
                ? `<img src="${product.image}" alt="${product.title}" class="selected-product-image">`
                : '<div class="selected-product-image" style="background: #f8f9fa; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;">Sin imagen</div>'
            }
            <div class="selected-product-title">
              ${product.title}
              ${product.quantity > 1 ? `<span class="product-quantity-badge">×${product.quantity}</span>` : ""}
            </div>
          </div>
        `;
      });

      summaryHTML += "</div>";
    }

    summaryContainer.innerHTML = summaryHTML;
  }

  // Inicializar todo
  initializeButtons();
  initializeRadioHandlers();
  showStep(1);

  // Manejar cambios en radio buttons
  function initializeRadioHandlers() {
    // Para subscription type
    document
      .querySelectorAll('input[name="subscription_type"]')
      .forEach((radio) => {
        radio.addEventListener("change", function () {
          document
            .querySelectorAll(".subscription-option")
            .forEach((opt) => opt.classList.remove("selected"));
          if (this.checked) {
            this.closest(".subscription-option").classList.add("selected");
          }

          // Actualizar indicador de pasos cuando cambia el tipo
          updateStepIndicator(1);
        });
      });

    // Para box size
    document.querySelectorAll('input[name="box_size"]').forEach((radio) => {
      radio.addEventListener("change", function () {
        document
          .querySelectorAll(".box-option")
          .forEach((opt) => opt.classList.remove("selected"));
        if (this.checked) {
          this.closest(".box-option").classList.add("selected");
        }
      });
    });

    // Para frequency
    document.querySelectorAll('input[name="frequency"]').forEach((radio) => {
      radio.addEventListener("change", function () {
        document
          .querySelectorAll(".frequency-option")
          .forEach((opt) => opt.classList.remove("selected"));
        if (this.checked) {
          this.closest(".frequency-option").classList.add("selected");
        }
      });
    });
  }

  // Hacer funciones globales
  window.addProduct = addProduct;
  window.updateQuantity = updateQuantity;
  window.removeProduct = removeProduct;
});
