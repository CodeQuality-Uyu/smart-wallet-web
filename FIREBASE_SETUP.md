# 🔥 Guía de configuración Firebase — SmartWallet App

Esta guía explica paso a paso cómo configurar Firebase para conectar la aplicación.
Incluye material teórico de cada servicio para que entiendas qué estás haciendo y por qué.

---

## 📚 ¿Qué es Firebase?

Firebase es una plataforma de Google que provee servicios de backend listos para usar sin necesidad de escribir ni deployar un servidor propio. Para esta app usamos dos de sus servicios:

| Servicio | Qué hace |
|---|---|
| **Authentication** | Verifica la identidad de los usuarios (quién sos) |
| **Firestore** | Base de datos en tiempo real donde se guardan los datos (qué datos tenés) |

Ambos están alojados en los servidores de Google. Vos solo configurás, no administrás infraestructura.

---

## 1️⃣ Crear el proyecto en Firebase

### ¿Qué es un proyecto de Firebase?
Un proyecto es el contenedor raíz de todos los servicios. Todo lo que configures (base de datos, autenticación, etc.) vive dentro de un proyecto. Podés tener múltiples proyectos (ej: uno para dev, uno para producción).

### Pasos

1. Ir a [https://console.firebase.google.com](https://console.firebase.google.com)
2. Hacer click en **"Agregar proyecto"** (o "Create a project")
3. Elegir un nombre, por ejemplo: `smart-wallet-app`
4. En la pantalla de Google Analytics → podés deshabilitarlo, no es necesario para esta app
5. Click en **"Crear proyecto"**

> ⏳ Firebase tarda unos segundos en aprovisionar el proyecto.

---

## 2️⃣ Registrar la aplicación web

### ¿Qué es registrar una app?
Firebase puede tener múltiples clientes conectados al mismo proyecto (iOS, Android, Web). "Registrar" le dice a Firebase que existe una app web que va a usar sus servicios. A cambio, Firebase te da las **credenciales de conexión** (el objeto `firebaseConfig`).

### Pasos

1. En la pantalla principal del proyecto, hacer click en el ícono **`</>`** (Web)
2. Asignar un apodo a la app, por ejemplo: `smart-wallet-web`
3. **No** tildar "Firebase Hosting" (no lo vamos a usar por ahora)
4. Click en **"Registrar app"**
5. Firebase muestra un bloque de código como este:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "smart-wallet-app.firebaseapp.com",
  projectId: "smart-wallet-app",
  storageBucket: "smart-wallet-app.appspot.com",
  appId: "1:123456789:web:abc123"
};
```

6. **Copiar esos valores** — los vas a necesitar en el paso final para el `.env.local`
7. Click en **"Continuar a la consola"**

> 🔑 Estos valores no son secretos en sí mismos (van en el frontend), pero sí identifican tu proyecto. No los expongas en un repositorio público.

---

## 3️⃣ Configurar Firestore Database

### ¿Qué es Firestore?
Firestore es una base de datos **NoSQL orientada a documentos**. No tiene tablas ni filas, sino **colecciones** que contienen **documentos** (objetos JSON).

```
📁 users/                        ← colección
   📄 uid_abc123/                ← documento (un usuario)
      name: "Juan"
      email: "juan@mail.com"
      📁 salaries/               ← subcolección
         📄 salary_1/
            amount: 75000
            currency: "UYU"
```

La app guarda los salarios bajo `users/{uid}/salaries/{salaryId}` — cada usuario tiene sus propios datos aislados dentro de su documento.

### Pasos

1. En el menú lateral de la consola, ir a **"Firestore Database"**
2. Click en **"Crear base de datos"**
3. Elegir modo:
   - **Modo de producción** → datos privados por defecto ✅ (recomendado)
   - Modo de prueba → datos públicos por 30 días (solo para experimentar)
4. Seleccionar la **ubicación** del servidor:
   - `southamerica-east1` → São Paulo 🇧🇷 (más cercano a Uruguay)
5. Click en **"Listo"**

### Configurar las reglas de seguridad

Las reglas determinan quién puede leer/escribir qué. Son el mecanismo de seguridad de Firestore.

1. Ir a la pestaña **"Reglas"** dentro de Firestore Database
2. Reemplazar el contenido con:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Perfil del usuario: solo él puede leer/escribir su propio documento
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Salarios: subcolección del usuario, misma regla
      match /salaries/{salaryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

3. Click en **"Publicar"**

> 🔒 **¿Qué hace esta regla?**
> `request.auth.uid == userId` significa que solo el usuario dueño del documento puede acceder a él. Si Juan intenta leer los datos de María, Firestore lo rechaza automáticamente.
> `request.auth != null` significa que el usuario debe estar autenticado (no puede ser anónimo).

---

## 4️⃣ Configurar Authentication

### ¿Qué es Firebase Authentication?
Es el servicio que verifica la identidad de los usuarios. Maneja el flujo completo de inicio de sesión y emite tokens seguros. Soporta múltiples métodos: email/contraseña, Google, GitHub, etc.

En esta app usamos **Email Link (passwordless)**: el usuario ingresa su email y recibe un enlace mágico. Al hacer click, queda autenticado sin necesidad de contraseña.

### ¿Por qué Email Link y no email/contraseña?
- No hay contraseñas que el usuario tenga que recordar
- No hay contraseñas que la app tenga que hashear y almacenar
- El email ya actúa como segundo factor (solo quien tiene acceso al email puede ingresar)

### Pasos

1. En el menú lateral, ir a **"Authentication"**
2. Click en **"Comenzar"**
3. Ir a la pestaña **"Sign-in method"**
4. Buscar **"Correo electrónico/Contraseña"** y hacer click
5. Habilitar la primera opción (Email/Contraseña): **activar** ✅
6. Habilitar la segunda opción (Enlace de correo electrónico): **activar** ✅
7. Click en **"Guardar"**

> ⚠️ Ambas opciones deben estar activadas. La segunda (Enlace de correo) es la que usa la app, pero Firebase requiere que la primera también esté habilitada.

### Configurar dominios autorizados

Firebase solo envía enlaces de sign-in a URLs que vos explícitamente autorizás. Esto previene que alguien use tu proyecto para redirigir a sitios maliciosos.

1. En **Authentication** → pestaña **"Settings"** → sección **"Authorized domains"**
2. Por defecto ya están `localhost` y tu dominio de Firebase
3. Para desarrollo local no necesitás agregar nada más
4. Cuando hagas deploy a producción, agregar el dominio de producción aquí

> 🌐 El `continueUrl` que la app manda en el email link es `http://localhost:5173/verify-code`. Firebase verifica que `localhost` esté en la lista de dominios autorizados antes de enviar el email.

---

## 5️⃣ Configurar las variables de entorno

Con los valores copiados en el paso 2, completar el archivo `.env.local` en la raíz del proyecto:

```env
VITE_API_BASE_URL=/api
VITE_APP_ENV=development
VITE_BACKEND=firestore

VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=smart-wallet-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=smart-wallet-app
VITE_FIREBASE_STORAGE_BUCKET=smart-wallet-app.appspot.com
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

> 🔄 Después de modificar `.env.local`, reiniciar el servidor de desarrollo (`npm run dev`).

---

## 6️⃣ Verificar que todo funciona

### Checklist

- [ ] El proyecto de Firebase está creado
- [ ] La app web está registrada y tenés el `firebaseConfig`
- [ ] Firestore Database está creado en modo producción
- [ ] Las reglas de Firestore están publicadas
- [ ] Authentication tiene habilitado Email/Contraseña **y** Email Link
- [ ] `.env.local` tiene `VITE_BACKEND=firestore` y todas las variables `VITE_FIREBASE_*`
- [ ] El servidor fue reiniciado después de editar `.env.local`

### Flujo de prueba

1. Abrir la app → debería ir a `/login`
2. Registrarse con un email real al que tengas acceso
3. Revisar la bandeja de entrada — llega un email de `noreply@smart-wallet-app.firebaseapp.com`
4. Hacer click en el enlace → la app te redirige a `/verify-code` y procesa el login automáticamente
5. En la consola de Firebase → **Authentication → Users** → el usuario debería aparecer listado
6. Ir a **Sueldos** → agregar un sueldo
7. En la consola de Firebase → **Firestore Database** → debería verse `users/{uid}/salaries/{id}`

---

## 🗂️ Estructura de datos en Firestore

```
📁 users/
   📄 {firebase_uid}/
      ├── name: string
      ├── email: string
      └── createdAt: ISO string
      │
      └── 📁 salaries/
             📄 {auto_id}/
                ├── amount: number
                ├── currency: "UYU" | "USD"
                ├── date: ISO string
                ├── notes: string
                └── createdAt: ISO string
```

---

## 🔒 Reglas de seguridad de Firestore

### Por qué son importantes

Por defecto, Firestore creado en modo producción **deniega todo acceso**. Sin reglas explícitas, ninguna operación desde la app funcionará.

Más importante: las reglas son la única barrera que impide que un usuario autenticado lea o modifique los datos de otro usuario. Sin ellas, cualquier persona con una cuenta podría consultar `users/{cualquier_uid}/cards` y ver tarjetas ajenas.

Las reglas se evalúan **en los servidores de Google**, antes de ejecutar cualquier lectura o escritura, independientemente de lo que haga el código del cliente.

### Desplegar las reglas

Las reglas están versionadas en el repositorio en [firestore.rules](../firestore.rules). Para publicarlas:

```bash
# Instalar Firebase CLI (solo la primera vez)
npm install -g firebase-tools

# Login y seleccionar proyecto (solo la primera vez)
firebase login
firebase use smart-wallet-e99f2

# Publicar reglas
firebase deploy --only firestore:rules
```

> Cada vez que modifiques `firestore.rules` tenés que volver a ejecutar el deploy para que los cambios tengan efecto.

### Qué cubren las reglas actuales

- Solo el usuario dueño (`request.auth.uid == uid`) puede leer y escribir su perfil y todas sus subcolecciones (tarjetas, categorías, sueldos).
- Cualquier otra colección o documento queda denegado por defecto.

---

## 🔄 Cambiar entre backends

Para volver a MSW (datos mock, sin Firebase):
```env
VITE_BACKEND=msw
```

Para usar Firestore (datos reales):
```env
VITE_BACKEND=firestore
```

No hay que cambiar ningún código — solo la variable de entorno y reiniciar el servidor.

---

## 💡 Conceptos clave resumidos

| Concepto | Descripción |
|---|---|
| **ID Token** | JWT que Firebase emite al autenticarse. Dura 1 hora. El SDK lo renueva automáticamente. |
| **Refresh Token** | Token de larga duración que Firebase usa para obtener nuevos ID Tokens. Vive en IndexedDB del navegador. |
| **UID** | Identificador único del usuario en Firebase Auth. Es la clave primaria para sus datos en Firestore. |
| **Email Link** | Método de autenticación sin contraseña. Firebase envía un enlace firmado al email del usuario. |
| **Security Rules** | Lenguaje de reglas de Firestore. Se evalúan en el servidor de Google antes de ejecutar cualquier operación. |
| **Subcolección** | Colección dentro de un documento. `users/{uid}/salaries` es una subcolección de `users/{uid}`. |
