# Permisos de Claude Code — settings.local.json

Descripción de cada entrada en `permissions.allow`.

---

## Herramientas nativas

| Permiso | Descripción |
|---|---|
| `Read(*)` | Leer cualquier archivo del proyecto sin restricción. |
| `Edit(*)` | Editar cualquier archivo del proyecto sin restricción. |
| `Write(*)` | Crear o sobreescribir cualquier archivo del proyecto. |

---

## npm / Node

| Permiso | Descripción |
|---|---|
| `Bash(npm install:*)` | Instalar dependencias con npm. |
| `Bash(npm run:*)` | Ejecutar cualquier script definido en `package.json` (build, dev, test, etc.). |
| `Bash(source ~/.nvm/nvm.sh && npm run:*)` | Igual que el anterior pero activando nvm primero, necesario en entornos donde npm no está en el PATH por defecto (WSL). |
| `Bash(npx msw:*)` | Ejecutar comandos de MSW via npx (ej: inicializar service worker). |
| `Bash(npx tsc:*)` | Ejecutar el compilador de TypeScript via npx. |
| `Bash(node_modules/.bin/tsc --noEmit)` | Verificar tipos de TypeScript sin emitir archivos, usando el binario local del proyecto. |
| `Bash(node -e \"require\\(''./node_modules/firebase/package.json''\\).version\")` | Leer la versión instalada del SDK de Firebase. |

---

## Git

| Permiso | Descripción |
|---|---|
| `Bash(git add:*)` | Agregar archivos al staging area. |
| `Bash(git commit -m ':*)` | Crear commits con mensaje. |
| `Bash(git stash:*)` | Guardar o recuperar cambios en el stash. |
| `Bash(git checkout:*)` | Cambiar de rama o restaurar archivos. |

---

## Búsqueda y navegación

| Permiso | Descripción |
|---|---|
| `Bash(find:*)` | Buscar archivos y directorios por nombre, tipo u otros criterios. |
| `Bash(grep:*)` | Buscar contenido dentro de archivos con expresiones regulares. |
| `Bash(xargs grep:*)` | Encadenar grep con xargs para búsquedas en múltiples archivos. |
| `Bash(grep -l \"yup\\|Yup\" ...)` | Permiso específico (legacy) para encontrar schemas Yup en el proyecto anterior. |
| `Bash(ls c:UsersOdin...*.md)` | Permiso específico (legacy) para listar archivos `.md` en una ruta de Windows anterior. |
| `Bash(which:*)` | Verificar si una herramienta está disponible en el PATH. |

---

## Edición de archivos via terminal

| Permiso | Descripción |
|---|---|
| `Bash(sed:*)` | Leer fragmentos de archivos (`sed -n`) o hacer reemplazos inline (`sed -i`). |

---

## Python

| Permiso | Descripción |
|---|---|
| `Bash(python3 -c ':*)` | Ejecutar scripts Python en línea (one-liners). |
| `Bash(python3 -c " import sys, json ...")` | Permiso específico (legacy) para parsear respuestas JSON de la API de Claude desde stdin. |
