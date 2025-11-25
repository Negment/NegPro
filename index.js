import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch'; 

const app = express();
app.use(cors()); 

const WORKER_URL = 'https://old-hill-026f.makerun01123.workers.dev'; 

// RenderがクライアントからのJSONボディを処理できるようにする
app.use(express.json());

// HTMLクライアントからの POSTリクエストを処理し、Workerへ転送
app.post('/api/fetch', async (req, res) => {
    // HTMLクライアントから送られてきたJSONデータ (url または query) を抽出
    const { url, query } = req.body;
    
    // ターゲットURLを構築 (Workerが期待する形式: WorkerURL/https://target.com)
    let targetUrl = url || query; // URLまたは検索クエリ
    
    // URLでない場合はGoogle検索のURLに変換
    if (targetUrl && !targetUrl.startsWith('http')) {
        targetUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
    }

    // Workerが期待する形式に合わせる
    const workerTargetUrl = `${WORKER_URL}/${encodeURIComponent(targetUrl)}`;
    
    // 転送リクエストのオプション
    const fetchOptions = {
        method: 'GET', // WorkerはGETで動作するため強制的にGET
        headers: {
            'Content-Type': 'application/json',
            // 必要なヘッダーがあれば追加
        },
    };

    try {
        // Render内部からWorkerへリクエストを送信
        const workerRes = await fetch(workerTargetUrl, fetchOptions);

        // Workerからの応答ヘッダーをクライアントに設定
        workerRes.headers.forEach((value, name) => {
            res.set(name, value);
        });

        // 応答ステータスコードを設定
        res.status(workerRes.status);

        // 応答ボディをストリーム転送
        if (workerRes.body) {
            workerRes.body.pipe(res);
        } else {
            res.end();
        }
        
    } catch (e) {
        console.error('Proxy Relay Error:', e);
        res.status(500).send({ success: false, error: 'Proxy Relay Communication Failed.' });
    }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Render Relay running on port ${port}!`));
