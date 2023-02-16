import Mustache from 'mustache';
import queryString from 'query-string';
import { Router } from '@tsndr/cloudflare-worker-router'
import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
import PhoneticKeyGenerator from './generators';
const assetManifest = JSON.parse(manifestJSON);

export interface Env {
    DB: D1Database,
    wafrs: KVNamespace,
    __STATIC_CONTENT: KVNamespace,
}

const router = new Router<Env>()

const customKeyModifier = (id: string, template: string) => (request: Request) => {
    let url = request.url
    //custom key mapping optional
    url = url.replace('/v', '').replace(`${id}`, template);
    return mapRequestToAsset(new Request(url, request))
}


router.post('/', async ({ req, res, env }) => {
    const { content } = queryString.parse(req.body);
    const id = PhoneticKeyGenerator.createKey(8);
    const resp = await env.DB.prepare("INSERT INTO pastes(id, content) VALUES(?, ?)")
        .bind(id, content)
        .run();

    try {
        new URL(content!.toString())
        res.raw = Response.redirect(`${new URL(req.url).origin}/v/${id}`, 302)
    } catch (err) {
        res.raw = Response.redirect(`${new URL(req.url).origin}/${id}`, 302)
    }
    return;
});


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
    const asset = await getAssetFromKV(req.raw, {
        ASSET_NAMESPACE: env.__STATIC_CONTENT,
        ASSET_MANIFEST: assetManifest,
        mapRequestToAsset: customKeyModifier(id, 'paste.html'),
    })

    try {
        const url = new URL(result.content)
        res.raw = Response.redirect(url.origin, 302);
        return;
    } catch (e) {
        res.headers.set("Content-Type", "text/html");
        res.body = Mustache.render(await asset.text()!, { paste: result.content, id });
        return;
    }
})

router.get('/v/:id', async ({ req, res, env }) => {
    const { id } = req.params;

    const resp = await env.DB.prepare("SELECT * FROM pastes WHERE id = ?")
        .bind(id ?? 0)
        .all();

    if (resp.results?.length === 0) {
        res.raw = Response.redirect(new URL(req.url).origin, 302);
        return;
    }

    const result: { content: string, user_id: number } = resp.results!.at(0) as { content: string, user_id: number };
    const asset = await getAssetFromKV(req.raw, {
        ASSET_NAMESPACE: env.__STATIC_CONTENT,
        ASSET_MANIFEST: assetManifest,
        mapRequestToAsset: customKeyModifier(id, 'view.html'),
    })

    try {
        res.headers.set("Content-Type", "text/html");
        res.body = Mustache.render(await asset.text()!, { paste: result.content, url: `${new URL(req.url).origin}/${id}`, id });
        return;
    } catch (e) {
        res.headers.set("Content-Type", "text/html");
        res.body = Mustache.render(await asset.text()!, { paste: result.content, id });
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
        const raw = {
            request,
            waitUntil: ctx.waitUntil.bind(ctx),
        };
        try {
            return await getAssetFromKV(
                raw,
                {
                    ASSET_NAMESPACE: env.__STATIC_CONTENT,
                    ASSET_MANIFEST: assetManifest,
                }
            );
        } catch (err) {
            return router.handle(env, request, { raw });
        }
    },
};
