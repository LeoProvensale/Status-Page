// import { obtenerEventosDeSalud } from "./awsHealthClient.js";

const REGION = "us-east-2";
const USER_POOL_DOMAIN =
  "https://us-east-2irsusw7ld.auth.us-east-2.amazoncognito.com";
const CLIENT_ID = "6vn8g1jf6o3ir970ku0kn57okv";
const REDIRECT_URI = "http://localhost:3000";

let globalToken = null;

function redirectToCognitoLogin() {
  const scope = encodeURIComponent("openid email phone");
  const loginUrl = `${USER_POOL_DOMAIN}/login?client_id=${CLIENT_ID}&response_type=code&scope=${scope}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}`;
  window.location.href = loginUrl;
}

function getCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("code");
}

function parseJwt(token) {
  try {
    const base64Payload = token.split(".")[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch (err) {
    console.error("Error al parsear JWT:", err);
    return {};
  }
}

async function exchangeCodeForToken(code) {
  const response = await fetch(`${USER_POOL_DOMAIN}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Error al obtener el token: ${err}`);
  }

  const data = await response.json();
  console.log("Token obtenido:", data.id_token);
  return data.id_token;
}

function renderDashboard(eventos) {
  const ctx = document.getElementById("grafico-dashboard")?.getContext("2d");
  if (!ctx) return;

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Producción", "Staging", "Dev"],
      datasets: [
        {
          label: "% Uptime últimos 30 días",
          data: [99.9, 98.5, 97.2],
          backgroundColor: ["#22c55e", "#facc15", "#f87171"],
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, max: 100 },
      },
    },
  });
}

function renderKPIs() {
  document.getElementById("kpi-datos").innerHTML = `
    <p><strong>MTTR:</strong> 1.8 horas</p>
    <p><strong>MTBF:</strong> 36.2 horas</p>
    <p><strong>Uptime por entorno:</strong></p>
    <ul><li>Producción: 99.95%</li><li>Staging: 98.70%</li><li>Dev: 97.80%</li></ul>
    <p><strong>Incidentes abiertos vs cerrados:</strong></p>
    <canvas id="grafico-incidentes" width="300" height="300"></canvas>
    <p><strong>Servicios más afectados:</strong></p>
    <canvas id="grafico-servicios" width="300" height="300"></canvas>
  `;

  new Chart(document.getElementById("grafico-incidentes"), {
    type: "doughnut",
    data: {
      labels: ["Abiertos", "Cerrados"],
      datasets: [{ data: [2, 14], backgroundColor: ["#eab308", "#10b981"] }],
    },
  });

  new Chart(document.getElementById("grafico-servicios"), {
    type: "bar",
    data: {
      labels: ["EC2", "S3", "Lambda"],
      datasets: [
        {
          label: "Cantidad de incidentes",
          data: [5, 3, 2],
          backgroundColor: "#3b82f6",
        },
      ],
    },
    options: { indexAxis: "y", responsive: true },
  });
}

function renderComparativos() {
  const contenedor = document.getElementById("grafico-comparativo");
  contenedor.innerHTML = "";
  ["EC2", "S3", "Lambda"].forEach((servicio) => {
    const canvas = document.createElement("canvas");
    contenedor.appendChild(canvas);

    new Chart(canvas, {
      type: "pie",
      data: {
        labels: [
          "Enero",
          "Febrero",
          "Marzo",
          "Abril",
          "Mayo",
          "Junio",
          "Julio",
          "Agosto",
          "Septiembre",
          "Octubre",
          "Noviembre",
          "Diciembre",
        ],
        datasets: [
          {
            label: `Uptime de ${servicio}`,
            data: Array.from({ length: 12 }, () => Math.random() * 10 + 90),
            backgroundColor: [
              "#16a34a",
              "#22c55e",
              "#4ade80",
              "#86efac",
              "#bef264",
              "#facc15",
              "#fcd34d",
              "#fde68a",
              "#fbbf24",
              "#f97316",
              "#fb923c",
              "#fca5a5",
            ],
          },
        ],
      },
      options: { responsive: true },
    });
  });
}

function mostrarContenidoParaUsuario(token) {
  const decoded = parseJwt(token);
  document.getElementById("login-status").innerText = `Hola, ${
    decoded.email || "usuario"
  }`;

  // MOCK: datos simulados para presentación
  const eventosMock = [
    { service: "EC2", statusCode: "open" },
    { service: "S3", statusCode: "closed" },
    { service: "Lambda", statusCode: "closed" },
    { service: "RDS", statusCode: "open" },
    { service: "EC2", statusCode: "closed" },
    { service: "EC2", statusCode: "closed" },
    { service: "S3", statusCode: "open" },
  ];

  renderDashboard(eventosMock);
  renderKPIs();
  renderComparativos();
}

// function mostrarContenidoParaUsuario(token) {
//   const decoded = parseJwt(token);
//   document.getElementById("login-status").innerText = `Hola, ${
//     decoded.email || "usuario"
//   }`;
//   obtenerEventosDeSalud(token)
//     .then((eventos) => {
//       renderDashboard(eventos);
//       renderKPIs();
//       renderComparativos();
//     })
//     .catch((err) => {
//       console.error("Error al obtener eventos:", err);
//       document.getElementById("kpi-datos").innerText =
//         "No se pudieron cargar los KPIs.";
//     });
// }

async function iniciarApp() {
  const code = getCodeFromUrl();
  if (!code) {
    redirectToCognitoLogin();
    return;
  }

  try {
    const token = await exchangeCodeForToken(code);
    if (!token) throw new Error("Token vacío o inválido");

    globalToken = token;
    mostrarContenidoParaUsuario(token);
  } catch (err) {
    console.error("Error en la autenticación:", err);
    document.getElementById("login-status").innerText =
      "Error de autenticación.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Navegación entre secciones
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.dataset.section;
      document.querySelectorAll(".seccion").forEach((sec) => {
        sec.style.display = sec.id === section ? "block" : "none";
      });
    });
  });

  // Modo claro/oscuro
  const toggle = document.getElementById("modo-toggle");
  if (toggle) {
    toggle.addEventListener("change", () => {
      document.body.classList.toggle("light-mode", toggle.checked);
      document.body.classList.toggle("dark-mode", !toggle.checked);
    });
  }

  // Iniciar la app con login
  iniciarApp();

  // Refrescar KPIs cada 3 min si ya está logueado
  setInterval(() => {
    if (globalToken) mostrarContenidoParaUsuario(globalToken);
  }, 180000);
});
