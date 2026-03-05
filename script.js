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
const previewFront = document.getElementById('previewFront');
const previewBack = document.getElementById('previewBack');
const openCameraBtn = document.getElementById('openCameraBtn');
const cameraContainer = document.getElementById('cameraContainer');
const cameraFeed = document.getElementById('cameraFeed');
const captureFrontBtn = document.getElementById('captureFrontBtn');
const captureBackBtn = document.getElementById('captureBackBtn');
const searchButton = document.getElementById('searchButton');
const resetButton = document.getElementById('resetButton'); // Botón nuevo
const statusText = document.getElementById('statusText');
const infoCard = document.getElementById('infoCard');
const scanLine = document.getElementById('scanLine');

let stream = null;

// --- SISTEMA DE CÁMARA DUAL ---
openCameraBtn.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" }, 
            audio: false 
        });
        cameraFeed.srcObject = stream;
        cameraContainer.style.display = 'block';
        statusText.innerHTML = "📸 Encuadra el cromo";
    } catch (err) {
        alert("Error al abrir la cámara. Revisa los permisos.");
    }
});

function capturePhoto(targetImg) {
    const canvas = document.createElement('canvas');
    canvas.width = cameraFeed.videoWidth;
    canvas.height = cameraFeed.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cameraFeed, 0, 0);
    
    targetImg.src = canvas.toDataURL('image/jpeg');
    targetImg.style.display = 'block';
    
    if (previewFront.src.includes('data:image')) {
        searchButton.disabled = false;
        statusText.innerHTML = "✅ Frontal lista. ¿Añadir trasera?";
    }
}

captureFrontBtn.onclick = () => capturePhoto(previewFront);
captureBackBtn.onclick = () => {
    capturePhoto(previewBack);
    statusText.innerHTML = "✅ Ambas fotos listas.";
};

document.getElementById('closeCameraBtn').onclick = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    cameraContainer.style.display = 'none';
};

// --- LÓGICA DE GALERÍA (INTELIGENTE) ---
imageInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const leerImagen = (file, target) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            target.src = ev.target.result;
            target.style.display = 'block';
            searchButton.disabled = false;
        };
        reader.readAsDataURL(file);
    };

    if (files.length >= 2) {
        leerImagen(files[0], previewFront);
        leerImagen(files[1], previewBack);
        statusText.innerHTML = "✅ Dos fotos cargadas.";
    } else {
        if (!previewFront.src || previewFront.style.display === 'none') {
            leerImagen(files[0], previewFront);
            statusText.innerHTML = "✅ Frontal cargada.";
        } else {
            leerImagen(files[0], previewBack);
            statusText.innerHTML = "✅ Trasera cargada.";
        }
    }
    imageInput.value = ""; 
});

// --- BOTÓN RESET (LIMPIAR TODO) ---
resetButton.onclick = () => {
    previewFront.src = "";
    previewFront.style.display = 'none';
    previewBack.src = "";
    previewBack.style.display = 'none';
    infoCard.style.display = 'none';
    searchButton.disabled = true;
    statusText.innerHTML = "🧹 Todo limpio.";
    statusText.style.color = "white";
    imageInput.value = "";
};

// --- ANÁLISIS ---
searchButton.addEventListener('click', async () => {
    if (!GEMINI_API_KEY) return;

    searchButton.disabled = true;
    statusText.style.color = "white";
    statusText.innerHTML = "⏳ Identificando con ambas caras...";
    scanLine.style.display = "block";
    infoCard.style.display = "none";

    try {
        const promptText = `Eres un tasador experto. Usa la trasera para confirmar número, año y colección. Dame el valor de VENTA RÁPIDA REAL.
        JSON: { "jugador": "Nombre", "tipo": "Variante", "coleccion": "Año", "precio_medio": "Valor", "pWallapop": "€", "pEbay": "€", "pTodo": "€", "pFanatics": "€", "query_especifica": "Marca Jugador Año Serie", "query_simple": "Marca Jugador" }`;

        const imageParts = [];
        imageParts.push({ inline_data: { mime_type: "image/jpeg", data: previewFront.src.split(',')[1] } });
        if (previewBack.src && previewBack.src.includes('data:image')) {
            imageParts.push({ inline_data: { mime_type: "image/jpeg", data: previewBack.src.split(',')[1] } });
        }

        // CORREGIDO: gemini-2.5-flash
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }, ...imageParts] }] })
        });

        const result = await response.json();
        const datos = JSON.parse(result.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/)[0]);
        mostrarResultados(datos);
        
    } catch (error) {
        statusText.style.color = "#f85149";
        statusText.innerHTML = "❌ Error. Prueba de nuevo.";
        searchButton.disabled = false;
    } finally {
        scanLine.style.display = "none";
    }
});

function mostrarResultados(datos) {
    statusText.style.color = "#39d353";
    statusText.innerHTML = "✅ Tasación de alta precisión completada.";
    infoCard.style.display = 'block';
    
    document.getElementById('dataJugador').innerText = datos.jugador;
    document.getElementById('dataTipo').innerText = datos.tipo;
    document.getElementById('dataColeccion').innerText = datos.coleccion;
    document.getElementById('precioMedio').innerText = datos.precio_medio;
    document.getElementById('pWallapop').innerText = datos.pWallapop;
    document.getElementById('pEbay').innerText = datos.pEbay;
    document.getElementById('pTodo').innerText = datos.pTodo;
    document.getElementById('pFanatics').innerText = datos.pFanatics;

    // --- MEJORA DE BÚSQUEDA ESPECÍFICA PARA WALLAPOP ---
    // Creamos una búsqueda que incluya Jugador + Año + Colección
    // Ejemplo: "Lamine Yamal 2024 Megacracks" en lugar de solo "Lamine Yamal"
    const busquedaWallapop = `${datos.jugador} ${datos.coleccion}`.trim();
    const qWalla = encodeURIComponent(busquedaWallapop).replace(/%20/g, '+');

    // Para eBay/Fanatics seguimos usando la query_especifica (incluye "Refractor", "Numbered", etc.)
    const qEsp = encodeURIComponent(datos.query_especifica).replace(/%20/g, '+');
    
    // Para Todocoleccion usamos la query_simple
    const qSim = encodeURIComponent(datos.query_simple).replace(/%20/g, '+');

    // ASIGNACIÓN A BOTONES
    document.getElementById('btnWallapop').onclick = () => 
        window.open(`https://es.wallapop.com/app/search?keywords=${qWalla}&filters_source=search_box`, '_blank');
    
    document.getElementById('btnEbay').onclick = () => 
        window.open(`https://www.ebay.es/sch/i.html?_nkw=${qEsp}&LH_Sold=1&LH_Complete=1`, '_blank');
    
    document.getElementById('btnFanatics').onclick = () => 
        window.open(`https://www.fanaticscollect.com/marketplace?q=${qEsp}`, '_blank');
    
    document.getElementById('btnTodo').onclick = () => 
        window.open(`https://www.todocoleccion.net/buscador?bu=${qSim}`, '_blank');
}