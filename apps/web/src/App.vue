<template>
  <main style="font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; padding:16px;">
    <header style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
      <h2 style="margin:0;">库存卡片（最简）</h2>
      <input v-model="q" placeholder="搜索：款式编码/名称/尺码" style="padding:8px;border:1px solid #ddd;border-radius:8px;min-width:240px;" />
      <button @click="load" style="padding:8px 12px;border:1px solid #ddd;border-radius:10px;cursor:pointer;">查询</button>
      <button @click="health" style="padding:8px 12px;border:1px solid #ddd;border-radius:10px;cursor:pointer;">API 健康</button>
    </header>

    <section style="margin-top:12px;">
      <details>
        <summary><b>CSV 快速导入</b>（无需聚水潭，先跑通数据）</summary>
        <p style="color:#666;font-size:12px">支持表头：code/款式编码、name/商品名、image/图片、size/尺码、available/可用库存、stock/总库</p>
        <input type="file" @change="onFile" accept=".csv" />
        <button @click="importCSV" style="padding:6px 10px;border:1px solid #ddd;border-radius:8px;cursor:pointer;">导入</button>
        <div style="color:#666;font-size:12px">{{ importStatus }}</div>
      </details>
    </section>

    <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-top:12px;">
      <div v-for="it in items" :key="it.sku_id" class="card" style="border:1px solid #eee;border-radius:16px;padding:12px;box-shadow:0 1px 3px rgba(0,0,0,.05)">
        <div style="display:flex;gap:8px;align-items:center;">
          <img :src="it.image_url || ''" @error="e=>e.target.style.background='#fafafa'" style="width:72px;height:72px;border-radius:10px;object-fit:cover;background:#f6f6f6;">
          <div>
            <div><b>{{ it.product_code }}</b> <span style="padding:2px 8px;border:1px solid #ddd;border-radius:999px;font-size:12px">{{ it.size || '-' }}</span></div>
            <div style="color:#666;font-size:12px">{{ it.product_name || '' }}</div>
            <div style="color:#666;font-size:12px">可用：{{ it.available_qty ?? 0 }} / 总库：{{ it.stock_qty ?? 0 }}</div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref } from 'vue'
const q = ref('')
const items = ref([])
const importStatus = ref('')

const API = (location.origin.includes('localhost') || location.hostname === '127.0.0.1')
  ? 'http://127.0.0.1:4000'
  : (location.origin.replace(/\/$/, '') + '/api')

async function health(){
  try{
    const r = await fetch(API + '/health')
    const j = await r.json()
    alert('API: ' + JSON.stringify(j))
  }catch(e){ alert('API 错误: ' + e.message) }
}

async function load(){
  const r = await fetch(API + '/items' + (q.value ? ('?q=' + encodeURIComponent(q.value)) : ''))
  const j = await r.json()
  items.value = j.items || []
}

let csvText = ''
function onFile(e){
  const f = e.target.files?.[0]
  if(!f) return
  f.text().then(t => csvText = t)
}
async function importCSV(){
  if(!csvText){ alert('请先选择 CSV 文件'); return }
  const r = await fetch(API + '/items/import', { method:'POST', headers:{ 'Content-Type':'text/csv' }, body: csvText })
  const j = await r.json()
  importStatus.value = JSON.stringify(j)
  if(j.ok) load()
}

load()
</script>
