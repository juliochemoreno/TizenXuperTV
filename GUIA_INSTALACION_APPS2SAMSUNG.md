# Guía de Instalación de TizenXuper TV con Apps2Samsung

Esta guía detalla paso a paso cómo instalar **TizenXuper TV** en cualquier Smart TV Samsung (modelos 2018 a 2026, con Tizen OS 4.0 hasta 9.0+) utilizando la herramienta gráfica **Apps2Samsung** (disponible para Windows y macOS).

---

## 📋 Requisitos Previos

1. **Smart TV Samsung** encendido y conectado a tu red Wi-Fi o por cable de red.
2. **Computadora (Windows o Mac)** conectada a la **misma red Wi-Fi/local** que el televisor.
3. El archivo del paquete de la app: **`TizenXuperTV_1.9.3_signed.wgt`** (o la versión más reciente).
4. La aplicación **Apps2Samsung** instalada en tu computadora ([Descargar desde el repositorio oficial de Apps2Samsung / GitHub](https://github.com/jeppevinkel/apps2samsung)).

---

## 📺 PASO 1: Activar el Modo Desarrollador en el Televisor

Este paso se realiza una sola vez para permitir que el televisor acepte aplicaciones externas:

1. En tu televisor Samsung, abre el menú de **Apps** (la tienda de aplicaciones de Smart Hub).
2. Con el control remoto, enfoca cualquier parte de la tienda de aplicaciones y presiona la siguiente secuencia numérica:
   ```text
   1  2  3  4  5
   ```
   *(Si tu control remoto no tiene teclado numérico físico, presiona el botón `123` en el control para desplegar los números en pantalla).*

3. Aparecerá una ventana emergente llamada **Developer Mode Configuration** (Configuración de modo desarrollador).
4. Cambia el interruptor a **ON**.
5. En el campo **Host PC IP**, introduce la dirección IP local de tu computadora (por ejemplo: `192.168.1.100` o la IP de tu PC en la red).
6. Presiona **OK**.
7. **Reiniciar completamente el televisor** (Paso obligatorio):
   - Mantén presionado el botón de **Encendido/Power** del control remoto durante **4 a 5 segundos** hasta que la pantalla se apague y vuelva a mostrar el logotipo de Samsung Tizen.
   - O bien, desconecta el cable de corriente del televisor durante 10 segundos y vuelve a conectarlo.

---

## 🔍 PASO 2: Obtener la IP del Televisor

Para que Apps2Samsung sepa a qué televisor conectarse:

1. En el televisor, entra en:
   **Configuración (Ajustes) > General > Red > Estado de la red > Configuración de IP**.
2. Anota la **Dirección IP** que aparece (ejemplo: `192.168.1.15`).

---

## 💻 PASO 3: Conectar e Instalar con Apps2Samsung

1. Abre **Apps2Samsung** en tu computadora (Windows o Mac).
2. En la pantalla principal, introduce la **IP de tu televisor** (la que obtuviste en el Paso 2).
3. Haz clic en el botón **Connect** (Conectar).
   - *Nota:* En la pantalla del televisor podría aparecer una ventana preguntando si deseas permitir la conexión desde tu PC. Acepta con el control remoto (**Permitir** / **Allow**).
4. En el menú de Apps2Samsung, busca la opción:
   - **"Install Custom WGT / TPK"** o **"Browse WGT"**.
5. Selecciona el archivo de la aplicación:
   `TizenXuperTV_1.9.3_signed.wgt`
6. Haz clic en **Install** (o **Sign & Install**).
7. Apps2Samsung realizará automáticamente:
   - Detección del ID único (DUID) de tu televisor.
   - Firma del paquete con el certificado de seguridad de Samsung.
   - Transferencia e instalación directa en el televisor.

En unos 10 a 20 segundos verás el mensaje de confirmación **"Installation Successful"** o **"App Installed"**.

---

## 🚀 PASO 4: Abrir y Disfrutar TizenXuper TV

1. En el televisor Samsung, presiona el botón **Home** (Inicio / Casa) del control remoto.
2. Ve a la barra de aplicaciones instaladas o entra a **Apps > Apps descargadas**.
3. Verás el icono de **TizenXuper TV**.
4. Ábrela:
   - Primero inicia sesión con **Telegram** (solo la primera vez): escanea con tu teléfono el código QR que aparece en la TV, toca **Iniciar** en el bot si aparece y luego **Sí, iniciar sesión en la TV**. Si no puedes escanear, envíale al bot el código que se ve en pantalla.
   - Luego verás la **Guía rápida de control remoto** (◄ ▲ ▼ ► para navegar, OK para reproducir y Atrás para volver).
   - En el segundo paso de bienvenida verás el código QR de apoyo y donaciones al proyecto comunitario.
   - Al pulsar OK, ingresarás a todo el catálogo de Canales en Vivo, Películas, Series y Anime.

---

## 🛠️ Solución de Problemas Frecuentes

### 1. "Cannot connect to TV" o error de conexión
- Asegúrate de que el televisor y la computadora estén en la **misma red Wi-Fi o cable Ethernet** (evita tener la PC en red de invitados o datos móviles).
- Revisa que el **Modo Desarrollador esté en ON** y que hayas reiniciado el TV manteniendo pulsado el botón Power.
- Revisa que el firewall de Windows o macOS no esté bloqueando las conexiones salientes.

### 2. Error "Check certificate error" o "Signature rejected" [-12 / 118]
- Esto ocurre si la app se intentó instalar sin firmar con el DUID del televisor.
- Al usar **Apps2Samsung**, asegúrate de que la app tenga permiso para generar el certificado de distribuidor para tu TV, o utiliza la opción **"Sign & Install"** dentro de la herramienta.

### 3. No se ve ningún canal ni película (bloqueo del proveedor de internet)
- Algunos proveedores (por ejemplo en Chile) bloquean los servidores de video. La app lo indica con el mensaje **"Tu proveedor de internet bloquea este canal"**; la TV abierta sí funciona.
- Cambia el DNS de la TV: **Configuración > General > Red > Estado de la red > Configuración de IP > Configuración de DNS > Introducir manualmente** y escribe `1.1.1.1` (o `8.8.8.8`). Luego cierra y abre la app.
- Si sigue igual, prueba con otra red (por ejemplo, internet compartido desde el teléfono). Si así funciona, el bloqueo es del proveedor y solo una VPN en el router lo evita.

### 4. La app no aparece en la barra de inicio
- Entra a **Smart Hub > Apps > Mis aplicaciones** (icono de engranaje arriba a la derecha).
- Busca **TizenXuper TV**, pulsa el botón de opciones en el control y selecciona **"Agregar a Inicio"** para que quede fija en tu barra principal.

---

> 💡 **Nota:** Para soporte, dudas o nuevas versiones, puedes consultar la sección **Ajustes > Apoyo y Donaciones** o **Sobre nosotros** directamente desde la aplicación.
