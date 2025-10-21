const tg = window.Telegram?.WebApp ?? null;

const titleElement = document.getElementById("title");
const subtitleElement = document.getElementById("subtitle");
const avatarElement = document.getElementById("avatar");
const closeButton = document.getElementById("close");
const productListElement = document.getElementById("product-list");
const cartListElement = document.getElementById("cart-list");
const emptyCartElement = document.getElementById("empty-cart");
const summaryElement = document.getElementById("summary");
const totalElement = document.getElementById("total");
const clearButton = document.getElementById("clear");

subtitleElement.dataset.mode = "default";

const currencyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const products = [
  {
    id: "latte",
    title: "Латте",
    description: "Эспрессо с молоком и лёгкой сладостью.",
    price: 220,
    emoji: "☕️",
  },
  {
    id: "flat-white",
    title: "Флэт уайт",
    description: "Двойной эспрессо с бархатистой микропеной.",
    price: 260,
    emoji: "🥛",
  },
  {
    id: "raf",
    title: "Раф ванильный",
    description: "Сливочный раф с натуральной ванилью.",
    price: 310,
    emoji: "🍨",
  },
  {
    id: "matcha",
    title: "Матча латте",
    description: "Матча с миндальным молоком и сиропом агавы.",
    price: 280,
    emoji: "🍵",
  },
];

const cart = new Map();

if (tg) {
  tg.ready();
  tg.expand();
  applyTheme(tg.themeParams);
  tg.onEvent("themeChanged", applyTheme);
} else {
  closeButton.hidden = true;
  subtitleElement.textContent =
    "Откройте страницу через Telegram, чтобы протестировать мини-приложение.";
  subtitleElement.dataset.mode = "status";
}

const user = tg?.initDataUnsafe?.user;
updateUserInfo(user);

renderProducts();
renderCart();

closeButton.addEventListener("click", () => {
  tg?.close();
});

clearButton.addEventListener("click", () => {
  if (!cart.size) return;
  cart.clear();
  renderCart();
  subtitleElement.textContent = "Заказ очищен. Добавьте напиток, чтобы продолжить.";
  subtitleElement.dataset.mode = "status";
  tg?.HapticFeedback?.notificationOccurred?.("warning");
});

if (tg) {
  tg.onEvent("mainButtonClicked", () => {
    const items = Array.from(cart.values());
    if (!items.length) return;

    const total = items.reduce(
      (sum, entry) => sum + entry.product.price * entry.quantity,
      0
    );

    const payload = {
      created_at: new Date().toISOString(),
      currency: "RUB",
      total,
      items: items.map(({ product, quantity }) => ({
        id: product.id,
        title: product.title,
        quantity,
        price: product.price,
        sum: product.price * quantity,
      })),
      user: user
        ? {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
          }
        : null,
    };

    tg.sendData(JSON.stringify(payload));
    subtitleElement.textContent =
      "Заказ отправлен боту — ожидайте подтверждение.";
    subtitleElement.dataset.mode = "status";
    tg.HapticFeedback?.notificationOccurred?.("success");
    clearCart();
  });
}

function renderProducts() {
  productListElement.innerHTML = "";

  products.forEach((product) => {
    const item = document.createElement("li");
    item.className = "product-card";
    item.dataset.productId = product.id;

    const icon = document.createElement("div");
    icon.className = "product-card__icon";
    icon.textContent = product.emoji;

    const info = document.createElement("div");
    info.className = "product-card__info";

    const title = document.createElement("p");
    title.className = "product-card__title";
    title.textContent = product.title;

    const description = document.createElement("p");
    description.className = "product-card__description";
    description.textContent = product.description;

    const price = document.createElement("span");
    price.className = "product-card__price";
    price.textContent = formatPrice(product.price);

    info.append(title, description, price);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary-button";
    button.textContent = "Добавить";
    button.setAttribute("aria-label", `Добавить «${product.title}» в заказ`);
    button.addEventListener("click", () => addToCart(product.id));

    item.append(icon, info, button);
    productListElement.appendChild(item);
  });
}

function renderCart() {
  cartListElement.innerHTML = "";

  const items = Array.from(cart.values());
  const hasItems = items.length > 0;

  emptyCartElement.hidden = hasItems;
  cartListElement.hidden = !hasItems;
  summaryElement.hidden = !hasItems;
  clearButton.hidden = !hasItems;

  if (!hasItems) {
    updateSubtitle(0, 0);
    updateMainButton(0, 0);
    totalElement.textContent = formatPrice(0);
    return;
  }

  let total = 0;
  let count = 0;

  items.forEach(({ product, quantity }) => {
    total += product.price * quantity;
    count += quantity;

    const cartItem = document.createElement("li");
    cartItem.className = "cart-item";

    const info = document.createElement("div");
    info.className = "cart-item__info";

    const title = document.createElement("div");
    title.className = "cart-item__title";
    title.textContent = `${product.emoji} ${product.title}`;

    const meta = document.createElement("div");
    meta.className = "cart-item__meta";
    meta.textContent = `${formatPrice(product.price)} × ${quantity}`;

    info.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "cart-item__actions";

    const minusButton = document.createElement("button");
    minusButton.type = "button";
    minusButton.className = "icon-button";
    minusButton.textContent = "−";
    minusButton.setAttribute(
      "aria-label",
      `Убрать одну порцию напитка «${product.title}»`
    );
    minusButton.addEventListener("click", () => decrementProduct(product.id));

    const quantityElement = document.createElement("span");
    quantityElement.className = "cart-item__quantity";
    quantityElement.textContent = String(quantity);

    const plusButton = document.createElement("button");
    plusButton.type = "button";
    plusButton.className = "icon-button";
    plusButton.textContent = "+";
    plusButton.setAttribute(
      "aria-label",
      `Добавить ещё одну порцию напитка «${product.title}»`
    );
    plusButton.addEventListener("click", () => addToCart(product.id));

    actions.append(minusButton, quantityElement, plusButton);
    cartItem.append(info, actions);
    cartListElement.appendChild(cartItem);
  });

  totalElement.textContent = formatPrice(total);
  updateSubtitle(count, total);
  updateMainButton(count, total);
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const existing = cart.get(productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.set(productId, { product, quantity: 1 });
  }

  renderCart();
  tg?.HapticFeedback?.impactOccurred?.("soft");
}

function decrementProduct(productId) {
  const existing = cart.get(productId);
  if (!existing) return;

  existing.quantity -= 1;
  if (existing.quantity <= 0) {
    cart.delete(productId);
  }

  renderCart();
  tg?.HapticFeedback?.impactOccurred?.("rigid");
}

function clearCart() {
  cart.clear();
  renderCart();
}

function updateMainButton(count, total) {
  if (!tg?.MainButton) return;

  if (!count) {
    tg.MainButton.hide();
    return;
  }

  const summary = `${count} ${declOfNum(count, ["товар", "товара", "товаров"])}`;
  tg.MainButton.setText(`Отправить ${summary} • ${formatPrice(total)}`);
  tg.MainButton.show();
  tg.MainButton.enable();
}

function updateSubtitle(count, total) {
  if (!count) {
    if (
      subtitleElement.dataset.mode === "status" ||
      subtitleElement.dataset.mode === "user"
    ) {
      return;
    }

    subtitleElement.dataset.mode = "default";
    subtitleElement.textContent = "Выберите напиток и оформите заказ.";
    return;
  }

  subtitleElement.dataset.mode = "order";
  subtitleElement.textContent = `В заказе ${count} ${declOfNum(count, [
    "напиток",
    "напитка",
    "напитков",
  ])} на сумму ${formatPrice(total)}.`;
}

function updateUserInfo(user) {
  if (!user) {
    titleElement.textContent = "Гость";
    subtitleElement.dataset.mode = "default";
    subtitleElement.textContent = "Выберите напиток и оформите заказ.";
    return;
  }

  titleElement.textContent = `Привет, ${user.first_name}!`;

  if (user.username) {
    subtitleElement.textContent = `@${user.username}`;
    subtitleElement.dataset.mode = "user";
  } else if (user.last_name) {
    subtitleElement.textContent = `${user.first_name} ${user.last_name}`;
    subtitleElement.dataset.mode = "user";
  } else {
    subtitleElement.dataset.mode = "default";
    subtitleElement.textContent = "Выберите напиток и оформите заказ.";
  }

  if (user.photo_url) {
    avatarElement.style.backgroundImage = `url(${user.photo_url})`;
    avatarElement.classList.add("app__avatar--photo");
    avatarElement.textContent = "";
  } else {
    avatarElement.textContent = getInitials(user);
  }
}

function applyTheme(themeParams = {}) {
  if (!themeParams) return;

  const root = document.documentElement;
  const mapping = {
    bg_color: "--bg-color",
    text_color: "--text-color",
    hint_color: "--hint-color",
    button_color: "--button-color",
    button_text_color: "--button-text-color",
    secondary_bg_color: "--secondary-bg-color",
  };

  Object.entries(mapping).forEach(([key, cssVar]) => {
    if (themeParams[key]) {
      root.style.setProperty(cssVar, themeParams[key]);
    }
  });

  if (themeParams.section_bg_color) {
    root.style.setProperty("--card-bg-color", themeParams.section_bg_color);
  }
}

function formatPrice(value) {
  return currencyFormatter.format(value);
}

function getInitials(user) {
  const first = user.first_name?.[0] ?? "";
  const last = user.last_name?.[0] ?? "";
  const fallback = user.username?.[0] ?? "T";
  const initials = `${first}${last}` || fallback;
  return initials.toUpperCase();
}

function declOfNum(number, titles) {
  const cases = [2, 0, 1, 1, 1, 2];
  return titles[
    number % 100 > 4 && number % 100 < 20
      ? 2
      : cases[number % 10 < 5 ? number % 10 : 5]
  ];
}
