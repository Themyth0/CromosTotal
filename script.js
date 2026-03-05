// --- GESTIÓN DE LA API KEY ---
let GEMINI_API_KEY = localStorage.getItem('gemini_api_key');
const apiKeyModal = document.getElementById('apiKeyModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');

if (!GEMINI_API_KEY) {
    apiKeyModal.style.display = 'flex';
}

saveKeyBtn.onclick = () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        GEMINI_API_KEY = key;
        apiKeyModal.style.display = 'none';
    } else {
        alert("Introduce una clave válida");
    }
};

// --- VARIABLES ---
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

// --- CÁMARA ---
openCameraBtn.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        cameraFeed.srcObject = stream;
        cameraContainer.style.display = 'block';
        imagePreview.style.display = 'none';
        infoCard.style.display = 'none';
        statusText.innerHTML = "";
    } catch (err) {
        alert("Error al abrir la cámara.");
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
        infoCard.style.display = 'none';
        statusText.innerHTML = "";
        searchButton.disabled = false;
    };
    reader.readAsDataURL(e.target.files[0]);
});

// --- LÓGICA DE ANÁLISIS REPARADA (Funciona a la primera) ---
searchButton.addEventListener('click', async () => {
    if (!GEMINI_API_KEY) {
        apiKeyModal.style.display = 'flex';
        return;
    }

    // Bloqueamos el botón INMEDIATAMENTE para que no haya dobles clics
    searchButton.disabled = true;
    statusText.style.color = "white";
    statusText.innerHTML = "⏳ Analizando mercado real...";
    scanLine.style.display = "block";
    infoCard.style.display = "none"; // Ocultamos el resultado anterior si lo hubiera

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
                    
                    FORMATO DE SALIDA ESTRICTO (JSON):
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

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Fallo en la conexión con la IA.");

        const result = await response.json();
        const rawText = result.candidates[0].content.parts[0].text;
        const datos = JSON.parse(rawText.match(/\{[\s\S]*\}/)[0]);

        mostrarResultados(datos);
        
    } catch (error) {
        // Si hay un error, lo mostramos claro y volvemos a activar el botón
        statusText.style.color = "#f85149";
        statusText.innerHTML = "❌ Error al analizar. Prueba de nuevo.";
        console.error(error);
        searchButton.disabled = false;
    } finally {
        scanLine.style.display = "none";
    }
});

function mostrarResultados(datos) {
    statusText.style.color = "#39d353";
    statusText.innerHTML = "✅ Tasación completada.";
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