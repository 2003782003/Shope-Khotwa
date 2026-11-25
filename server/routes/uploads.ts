import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import type { AppConfig } from '../config';
import type { Repo } from '../db/types';
import { audit } from '../lib/audit';
import { AppError, notFound } from '../lib/errors';
import { assertStaff } from '../middleware/auth';

const ALLOWED = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/pdf', 'pdf'],
]);

const SAFE_NAME = /^[a-f0-9]{32}\.(?:jpg|png|webp|pdf)$/;

export function uploadsRouter(repo: Repo, config: AppConfig): Router {
  const router = Router();
  const uploadDir = path.resolve(config.uploadDir);

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxUploadBytes, files: 1, fields: 5 },
  });

  router.post('/', upload.single('file'), async (req, res) => {
    assertStaff(req);
    const file = req.file;
    if (!file) throw new AppError(400, 'file_required', 'No file provided');

    // Real content sniffing: the extension and client MIME type are ignored.
    const detected = await fileTypeFromBuffer(file.buffer);
    if (!detected || !ALLOWED.has(detected.mime)) {
      throw new AppError(415, 'unsupported_file_type', 'Only JPEG, PNG, WebP or PDF files are allowed');
    }
    // Belt and braces: reject anything with executable-looking leading bytes.
    const head = file.buffer.subarray(0, 4).toString('latin1');
    if (head.startsWith('#!') || head.startsWith('<?ph')) {
      throw new AppError(415, 'unsupported_file_type', 'File content rejected');
    }

    const name = `${randomBytes(16).toString('hex')}.${ALLOWED.get(detected.mime)}`;
    await mkdir(uploadDir, { recursive: true, mode: 0o700 });
    await writeFile(path.join(uploadDir, name), file.buffer, { mode: 0o600 });

    await audit(repo, req, {
      userId: req.auth!.session.userId,
      action: 'file_uploaded',
      entityType: 'upload',
      entityId: name,
      details: { mime: detected.mime, bytes: file.size },
    });

    res.status(201).json({
      id: name,
      url: `/api/uploads/${name}`,
      mime: detected.mime,
      bytes: file.size,
    });
  });

  // Files are served by the API (never statically from the web root) and only
  // to authenticated staff. The filename is validated before hitting disk.
  router.get('/:name', async (req, res) => {
    assertStaff(req);
    const name = req.params.name;
    if (typeof name !== 'string' || !SAFE_NAME.test(name)) throw notFound('file_not_found');
    const full = path.join(uploadDir, name);
    if (!full.startsWith(uploadDir + path.sep)) throw notFound('file_not_found');
    const data = await readFile(full).catch(() => null);
    if (!data) throw notFound('file_not_found');
    const ext = path.extname(name).slice(1);
    const mime = [...ALLOWED.entries()].find(([, e]) => e === ext)?.[0] ?? 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(data);
  });

  return router;
}
