import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch'; 

const app = express();
app.use(cors()); 

const WORKER_URL = 'https://old-hill-026f.makerun01123.workers.dev'; 

// RenderがクライアントからのJSONボディを処理できるようにする (必須)
app.use(express.json());

// HTMLクライアントからの POSTリクエストを処理し、Workerへ転送
app.post('/api/fetch', async (req, res) => {
    // HTMLクライアントから送られてきたJSONデータ (url または query) を抽出
    const { url, query } = req.body;
    
    // ターゲットURLを構築 (Workerが期待する形式: WorkerURL/https://target.com)
    let targetUrl = url || query;

    // ターゲットURLが空の場合はエラー応答 (通信エラーを避ける)
    if (!targetUrl) {
        return res.status(400).json({ success: false, error: 'URLまたは検索クエリがありません。' });
    }
    
    // URLでない場合はGoogle検索のURLに変換
    if (!targetUrl.startsWith('http')) {
        targetUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
    }

    // Workerが期待する形式に合わせる
    const workerTargetUrl = `${WORKER_URL}/${encodeURIComponent(targetUrl)}`;
    
    // 転送リクエストのオプション
    const fetchOptions = {
        method: 'GET', // WorkerはGETで動作するため強制的にGET
        // Workerへのリクエストに不要なヘッダーは削除
        headers: {}, 
    };

    try {
        // Render内部からWorkerへリクエストを送信
        const workerRes = await fetch(workerTargetUrl, fetchOptions);

        // Workerからの応答ボディをテキストとして取得
        const workerBodyText = await workerRes.text();

        // Workerの応答ステータスコードを確認 (200 OK以外はエラーとして扱う)
        if (workerRes.status !== 200) {
            // Workerがエラーを返した場合、JSON形式で返す
            return res.status(workerRes.status).json({ success: false, error: `Worker Error (Status: ${workerRes.status})` });
        }
        
        // 正常な応答の場合、HTMLボディをJSON形式でラップしてクライアントに返す
        // これで「The string did not match the expected pattern.」エラーが解消されます。
        return res.status(200).json({ 
            success: true, 
            data: workerBodyText // ここがHTMLRewriterで書き換えられたHTML
        });
        
    } catch (e) {
        // 通信エラーをJSON形式で返す
        console.error('Workerとの通信エラー:', e);
        res.status(500).json({ success: false, error: `Proxy Relay Communication Failed: ${e.message}` });
    }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Render Relay running on port ${port}!`));
