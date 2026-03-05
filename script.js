// --- GESTIÓN DE LA API KEY SEGURA ---
// Intentamos recuperar la clave del almacenamiento del móvil/navegador
let GEMINI_API_KEY = localStorage.getItem('gemini_api_key');

// Elementos del Modal de configuración (asegúrate de tenerlos en tu HTML)
const apiKeyModal = document.getElementById('apiKeyModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');

// Si no hay clave guardada, mostramos el modal para que el usuario la ponga
if (!GEMINI_API_KEY) {
    apiKeyModal.style.display = 'flex';
}

// Función para guardar la clave cuando el usuario pulsa el botón
saveKeyBtn.onclick = () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        GEMINI_API_KEY = key;
        apiKeyModal.style.display = 'none';
        alert("✅ API Key guardada en este dispositivo.");
    } else {
        alert("Por favor, introduce una clave válida.");
    }
};

// --- RESTO DE TUS VARIABLES ---
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const openCameraBtn = document.getElementById('openCameraBtn');
const cameraContainer = document.getElementById('cameraContainer');
const cameraFeed = document.getElementById('cameraFeed');
const captureBtn = document.getElementById('captureBtn');
const searchButton = document.getElementById('searchButton');
const statusText = document.getElementById('statusText');
const infoCard = document.getElementById('infoCard');
const scanLine = document.getElementById('scanLine');

let stream = null;

// --- LÓGICA DE CÁMARA ---
openCameraBtn.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" }, 
            audio: false 
        });
        cameraFeed.srcObject = stream;
        cameraContainer.style.display = 'block';
        imagePreview.style.display = 'none';
        infoCard.style.display = 'none';
    } catch (err) {
        alert("Error al abrir la cámara: " + err);
    }
});

captureBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = cameraFeed.videoWidth;
    canvas.height = cameraFeed.videoHeight;
    canvas.getContext('2d').drawImage(cameraFeed, 0, 0);
    
    imagePreview.src = canvas.toDataURL('image/jpeg');
    imagePreview.style.display = 'block';
    
    stopCamera();
    searchButton.disabled = false;
});

function stopCamera() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    cameraContainer.style.display = 'none';
}

imageInput.addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        imagePreview.src = event.target.result;
        imagePreview.style.display = 'block';
        searchButton.disabled = false;
    };
    reader.readAsDataURL(e.target.files[0]);
});

// --- LÓGICA DE ANÁLISIS (PRECIOS REALISTAS + BÚSQUEDA EXACTA) ---
searchButton.addEventListener('click', async () => {
    // Verificación de seguridad: si no hay clave, no dejamos avanzar
    if (!GEMINI_API_KEY) {
        apiKeyModal.style.display = 'flex';
        return;
    }

    statusText.innerHTML = "⚖️ Tasando con precios de mercado real (Venta Rápida)...";
    scanLine.style.display = "block";
    searchButton.disabled = true;

    try {
        const base64Image = imagePreview.src.split(',')[1];

        const payload = {
            contents: [{
                parts: [
                    { text: `Eres un tasador experto de mercado secundario (Wallapop/eBay). 
                    Tu misión es dar el VALOR DE VENTA RÁPIDA, no el valor de catálogo.
                    
                    INSTRUCCIONES DE PRECIO:
                    1. Si el cromo es común, el precio es 1€-3€.
                    2. Si es una marca como Daka o Mundicromo, no asumas que es cara por ser antigua; busca el precio de usuario particular (10€-20€ máximo si no es una estrella mundial).
                    3. REGLA DE ORO: Si dudas entre un precio de 70$ y uno de 18$, elige SIEMPRE el más bajo. Prefiero que la tasación sea baja a que sea engañosa.
                    
                    FORMATO DE SALIDA (JSON):
                    {
                      "jugador": "Nombre",
                      "tipo": "Serie/Variante",
                      "coleccion": "Marca/Año",
                      "precio_medio": "Valor más bajo encontrado",
                      "pWallapop": "Precio venta rápida",
                      "pEbay": "Precio venta finalizada",
                      "pTodo": "Precio Todocoleccion",
                      "pFanatics": "Precio USA",
                      "query_especifica": "Marca Jugador Año Serie",
                      "query_simple": "Marca Jugador Año"
                    }` 
                    },
                    { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                ]
            }]
        };

        // NOTA: He actualizado la URL para usar la variable GEMINI_API_KEY dinámica
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const rawText = result.candidates[0].content.parts[0].text;
        const datos = JSON.parse(rawText.match(/\{[\s\S]*\}/)[0]);

        mostrarResultados(datos);
    } catch (error) {
        statusText.innerText = "❌ Error en el análisis. Verifica tu API Key.";
        console.error(error);
    } finally {
        searchButton.disabled = false;
        scanLine.style.display = "none";
    }
});

function mostrarResultados(datos) {
    statusText.innerHTML = "✅ Tasación conservadora lista.";
    infoCard.style.display = 'block';
    
    document.getElementById('dataJugador').innerText = datos.jugador;
    document.getElementById('dataTipo').innerText = datos.tipo;
    document.getElementById('dataColeccion').innerText = datos.coleccion;
    document.getElementById('precioMedio').innerText = datos.precio_medio;
    document.getElementById('pWallapop').innerText = datos.pWallapop;
    document.getElementById('pEbay').innerText = datos.pEbay;
    document.getElementById('pTodo').innerText = datos.pTodo;
    document.getElementById('pFanatics').innerText = datos.pFanatics;

    const qEsp = encodeURIComponent(datos.query_especifica).replace(/%20/g, '+');
    const qSim = encodeURIComponent(datos.query_simple).replace(/%20/g, '+');

    document.getElementById('btnWallapop').onclick = () => window.open(`https://es.wallapop.com/app/search?keywords=${qEsp}&filters_source=search_box`, '_blank');
    document.getElementById('btnEbay').onclick = () => window.open(`https://www.ebay.es/sch/i.html?_nkw=${qEsp}&LH_Sold=1&LH_Complete=1`, '_blank');
    document.getElementById('btnFanatics').onclick = () => window.open(`https://www.fanaticscollect.com/marketplace?type=FIXED&category=Sports+Cards+%3E+Soccer&q=${qEsp}&page=1`, '_blank');
    document.getElementById('btnTodo').onclick = () => window.open(`https://www.todocoleccion.net/buscador?from=top&bu=${qSim}&forced&sec=coleccionismo-deportivo`, '_blank');
}