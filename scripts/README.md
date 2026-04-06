# Scripts de migración

Scripts one-shot de admin para migrar datos en Firestore. **Nunca correr inline desde la app.**

---

## Requisitos generales

### Dependencias
```bash
npm install -D tsx firebase-admin
```

### Autenticación

Los scripts usan Firebase Admin SDK. Necesitás credenciales de una Service Account con acceso de lectura/escritura a Firestore.

**Opción A — variable de entorno con JSON:**
```bash
export FIREBASE_SERVICE_ACCOUNT_JSON='{ "type": "service_account", ... }'
npx tsx scripts/<nombre>.ts
```

**Opción B — archivo de credenciales (Application Default Credentials):**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/ruta/a/serviceAccount.json"
npx tsx scripts/<nombre>.ts
```

Para obtener la Service Account: Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.

---

## Migraciones disponibles

### `migrate-recurring-categoryIds.ts`

**Cuándo correr:** una vez, luego de desplegar la versión que cambió `categoryId: string` → `categoryIds: string[]` en `RecurringExpense`.

**Qué hace:**
- Recorre todos los documentos `users/{uid}/recurring`
- Los que aún tienen `categoryId` (string) los reescribe con `categoryIds: [categoryId]` y elimina el campo viejo
- Los que ya tienen `categoryIds` los saltea (idempotente)

**Compatibilidad hacia atrás:** el frontend maneja ambos formatos en `toRecurring()` mientras no se haya migrado.

```bash
npx tsx scripts/migrate-recurring-categoryIds.ts
```

---

### `migrate-places-to-global-pool.ts`

**Cuándo correr:** una vez, luego de desplegar el modelo de locales comunitarios (`/places` pool global + `globalPlaceId` en copias personales).

**Qué hace:**
- Recorre todos los `users/{uid}/places` activos sin `globalPlaceId`
- Para cada uno busca en `/places` si ya existe un lugar con el mismo `nameLower` (deduplicación)
  - Si existe: vincula con ese `globalPlaceId`
  - Si no existe: crea una entrada nueva en `/places` y vincula
- Idempotente: los lugares ya vinculados se saltean

**Requisito previo:** índice en `/places` sobre el campo `nameLower ASC`. Firebase genera el link al índice en el primer error de query si no existe.

```bash
npx tsx scripts/migrate-places-to-global-pool.ts
```

---

## Notas

- Todos los scripts son **idempotentes** — se pueden correr más de una vez sin efecto secundario.
- Antes de correr en producción, revisar el output en dry-run comentando las líneas de `update()` / `add()`.
- Los scripts logean cada documento modificado para auditoría.
