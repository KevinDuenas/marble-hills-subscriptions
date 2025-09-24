// Main Subscription Manager
class SubscriptionManager {
  constructor() {
    this.subscriptionData = {};
    this.selectedProducts = [];
    this.currentStep = 1;
    this.form = null;
    this.init();
  }

  init() {
    console.log("Initializing Subscription Manager");
    this.findFormContainer();
    if (this.form) {
      this.initializeNavigation();
      this.initializeRadioHandlers();
      this.clearAllSelections();
      this.initializeNextButtonStates();
      this.showStep(1);
    }
  }

  findFormContainer() {
    this.form = document.querySelector(".subscription-builder");

    if (!this.form) {
      const stepIndicator = document.querySelector(".form-step");
      if (stepIndicator) {
        this.form = stepIndicator.closest("div") || stepIndicator.parentElement;
      }
    }

    if (!this.form) {
      console.error("Could not find subscription form container");
      return;
    }

    console.log("Using form container:", this.form);
  }

  showStep(stepNumber) {
    console.log("Showing step:", stepNumber);
    this.currentStep = stepNumber;

    const allSteps = document.querySelectorAll(".form-step");
    console.log("Total steps found:", allSteps.length);

    // Hide all steps
    allSteps.forEach((step, index) => {
      step.classList.remove("active");
      step.style.display = "none";
    });

    // Show current step
    const currentStep = document.querySelector(
      `.form-step[data-step="${stepNumber}"]`,
    );
    if (currentStep) {
      currentStep.classList.add("active");
      currentStep.style.display = "flex";
      console.log("Successfully activated step:", stepNumber, currentStep);
    } else {
      console.error("Step not found:", stepNumber);
    }
  }

  validateCurrentStep(stepNumber) {
    const subscriptionType = document.querySelector(
      'input[name="subscription_type"]:checked',
    )?.value;

    if (stepNumber === 1) {
      if (!subscriptionType) {
        alert("Por favor selecciona un tipo de suscripción");
        return false;
      }
    }

    if (stepNumber === 2) {
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
        alert("Por favor selecciona una frecuencia de entrega");
        return false;
      }
    }

    if (stepNumber === 4) {
      if (subscriptionType === "custom" && this.selectedProducts.length === 0) {
        alert("Por favor selecciona al menos un producto");
        return false;
      }
      if (
        subscriptionType === "curated" &&
        this.selectedProducts.length === 0
      ) {
        alert("Por favor selecciona una caja");
        return false;
      }
    }

    return true;
  }

  updateSubscriptionData() {
    const type = document.querySelector(
      'input[name="subscription_type"]:checked',
    )?.value;
    const boxSize = document.querySelector(
      'input[name="box_size"]:checked',
    )?.value;
    const frequency = document.querySelector(
      'input[name="frequency"]:checked',
    )?.value;

    this.subscriptionData = {
      type,
      boxSize,
      frequency,
      selectedProducts: this.selectedProducts,
    };

    console.log("Updated subscription data:", this.subscriptionData);
  }

  initializeNavigation() {
    console.log("Initializing navigation buttons");

    // Next buttons
    document.querySelectorAll(".next-step").forEach((button, index) => {
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);

      newButton.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("NEXT BUTTON CLICKED - DEBUG START");

        const currentStepElement = newButton.closest(".form-step");
        const currentStep = parseInt(currentStepElement.dataset.step);
        const subscriptionType = document.querySelector(
          'input[name="subscription_type"]:checked',
        )?.value;

        console.log(`STEP ELEMENT:`, currentStepElement);
        console.log(
          `CURRENT STEP: ${currentStep} (type: ${typeof currentStep})`,
        );
        console.log(`SUBSCRIPTION TYPE: ${subscriptionType}`);

        if (this.validateCurrentStep(currentStep)) {
          console.log(`VALIDATION PASSED FOR STEP ${currentStep}`);
          this.updateSubscriptionData();

          let nextStep;

          // NUEVA LÓGICA DE NAVEGACIÓN - FORZADA
          console.log(`CHECKING NAVIGATION FOR STEP ${currentStep}`);

          if (currentStep === 1) {
            nextStep = 2;
            console.log(`FORCED NAVIGATION: Step 1 → Step 2 (BOTH TYPES)`);
          } else if (currentStep === 2) {
            nextStep = 3;
            console.log(`NAVIGATION: Step 2 → Step 3 (FREQUENCY)`);
          } else if (currentStep === 3 && subscriptionType === "custom") {
            nextStep = 4;
            console.log(`NAVIGATION: Step 3 → Step 4 (CUSTOM PRODUCTS)`);
            this.showStep(nextStep);
            this.setupProductStep("custom");
            if (window.productManager) {
              window.productManager.selectedProducts = [];
              window.productManager.loadAllProducts();
            }
            return;
          } else if (currentStep === 3 && subscriptionType === "curated") {
            nextStep = 4;
            console.log(`NAVIGATION: Step 3 → Step 4 (CURATED PRODUCTS)`);
            this.showStep(nextStep);
            this.setupProductStep("curated");
            if (window.productManager) {
              window.productManager.selectedProducts = [];
              window.productManager.loadAllProducts();
            }
            return;
          } else {
            nextStep = parseInt(newButton.dataset.next);
            console.log(`FALLBACK NAVIGATION TO: ${nextStep}`);
          }

          console.log(`FINAL NEXT STEP: ${nextStep}`);
          this.showStep(nextStep);
        } else {
          console.log(`VALIDATION FAILED FOR STEP ${currentStep}`);
        }
      });
    });

    // Previous buttons
    document.querySelectorAll(".prev-step").forEach((button, index) => {
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);

      newButton.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("Previous button clicked");

        const currentStep = parseInt(
          newButton.closest(".form-step").dataset.step,
        );
        let prevStep = parseInt(newButton.dataset.prev);

        console.log(`Going back from step ${currentStep} to step ${prevStep}`);
        this.showStep(prevStep);
      });
    });

    // Create subscription button
    const createButton = document.getElementById("create-subscription");
    if (createButton) {
      const newCreateButton = createButton.cloneNode(true);
      createButton.parentNode.replaceChild(newCreateButton, createButton);

      newCreateButton.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("Create subscription clicked");

        if (this.validateCurrentStep(4)) {
          if (window.cartManager) {
            window.cartManager.createSubscription();
          }
        }
      });
    }
  }

  setupProductStep(subscriptionType) {
    const titleElement = document.getElementById("products-step-title");
    const descriptionElement = document.getElementById(
      "products-step-description",
    );
    const discountContainer = document.getElementById(
      "discount-progress-container",
    );
    const counterText = document.getElementById("counter-text");

    if (subscriptionType === "curated") {
      if (titleElement) titleElement.textContent = "Select Your Box";
      if (descriptionElement)
        descriptionElement.textContent =
          "You can change your box month to month";
      if (discountContainer) discountContainer.style.display = "none";
      if (counterText) counterText.textContent = "box selected";
    } else {
      if (titleElement) titleElement.textContent = "Select Cuts";
      if (descriptionElement)
        descriptionElement.textContent =
          "Build My Box!";
      if (discountContainer) discountContainer.style.display = "block";
      if (counterText) counterText.textContent = "selected";
    }

    console.log(`Product step configured for: ${subscriptionType}`);
  }

  clearAllSelections() {
    document
      .querySelectorAll(".subscription-option")
      .forEach((opt) => opt.classList.remove("selected"));
    document
      .querySelectorAll(".box-option")
      .forEach((opt) => opt.classList.remove("selected"));
    document
      .querySelectorAll(".frequency-option")
      .forEach((opt) => opt.classList.remove("selected"));

    document.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.checked = false;
    });
  }

  initializeRadioHandlers() {
    // Subscription type handlers
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
          window.subscriptionManager.updateNextButtonState(1);
        });
      });

    // Box size handlers
    document.querySelectorAll('input[name="box_size"]').forEach((radio) => {
      radio.addEventListener("change", function () {
        document
          .querySelectorAll(".box-option")
          .forEach((opt) => opt.classList.remove("selected"));
        if (this.checked) {
          this.closest(".box-option").classList.add("selected");
        }
        window.subscriptionManager.updateNextButtonState(2);
      });
    });

    // Frequency handlers
    document.querySelectorAll('input[name="frequency"]').forEach((radio) => {
      radio.addEventListener("change", function () {
        document
          .querySelectorAll(".frequency-option")
          .forEach((opt) => opt.classList.remove("selected"));
        if (this.checked) {
          this.closest(".frequency-option").classList.add("selected");
        }
        window.subscriptionManager.updateNextButtonState(3);
      });
    });
  }

  updateNextButtonState(stepNumber) {
    const currentStepElement = document.querySelector(
      `.form-step[data-step="${stepNumber}"]`,
    );
    if (!currentStepElement) return;

    const nextButton = currentStepElement.querySelector(".next-step");
    if (!nextButton) return;

    let isComplete = false;

    switch (stepNumber) {
      case 1:
        isComplete =
          document.querySelector('input[name="subscription_type"]:checked') !==
          null;
        break;
      case 2:
        isComplete =
          document.querySelector('input[name="box_size"]:checked') !== null;
        break;
      case 3:
        isComplete =
          document.querySelector('input[name="frequency"]:checked') !== null;
        break;
    }

    nextButton.disabled = !isComplete;
    nextButton.style.opacity = isComplete ? "1" : "0.5";
    nextButton.style.cursor = isComplete ? "pointer" : "not-allowed";
  }

  initializeNextButtonStates() {
    document.querySelectorAll(".next-step").forEach((button) => {
      button.disabled = true;
      button.style.opacity = "0.5";
      button.style.cursor = "not-allowed";
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  window.subscriptionManager = new SubscriptionManager();
});
