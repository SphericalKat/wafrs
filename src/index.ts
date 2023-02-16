import Mustache from 'mustache';
import { Router } from '@tsndr/cloudflare-worker-router'
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
const assetManifest = JSON.parse(manifestJSON);

export interface Env {
    DB: D1Database,
    wafrs: KVNamespace,
    __STATIC_CONTENT: KVNamespace,
}

const router = new Router<Env>()


router.get('/:id', async ({ req, res, env }) => {
    const { id } = req.params;

    const resp = await env.DB.prepare("SELECT * FROM pastes WHERE id = ?")
        .bind(id ?? 0)
        .all();

    if (resp.results?.length === 0) {
        res.raw = Response.redirect(new URL(req.url).origin, 302);
        return;
    }

    const result: { content: string, user_id: number } = resp.results!.at(0) as { content: string, user_id: number };

    try {
        const url = new URL(result.content)
        res.raw = Response.redirect(url.origin, 302);
        return;
    } catch (e) {
        const template = await env.__STATIC_CONTENT.get('paste.mustache');
        res.headers.set("Content-Type", "text/html");
        res.body = Mustache.render(template!, { paste: result.content, id });
        return;
    }
})

router.get('/:id/raw', async ({ req, res, env }) => {
    const { id } = req.params;

    const resp = await env.DB.prepare("SELECT * FROM pastes WHERE id = ?")
        .bind(id ?? 0)
        .all();

    if (resp.results?.length === 0) {
        res.raw = Response.redirect(new URL(req.url).origin, 302);
        return;
    }

    const result: { content: string, user_id: number } = resp.results!.at(0) as { content: string, user_id: number };

    res.headers.set("Content-Type", "text/plain");
    res.body = result.content;
    return;

})

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ): Promise<Response> {
        try {
            return await getAssetFromKV(
                {
                    request,
                    waitUntil: ctx.waitUntil.bind(ctx),
                },
                {
                    ASSET_NAMESPACE: env.__STATIC_CONTENT,
                    ASSET_MANIFEST: assetManifest,
                }
            );
        } catch (err) {
            return router.handle(env, request);
        }
    },
};
