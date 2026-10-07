// Renderização única: dados do Decap -> HTML estático. Sem dependências externas.
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sitePath(value) {
  const s=String(value ?? '').trim();
  if(s==='/') return './';
  return /^\/(?!\/)/.test(s)?s.replace(/^\/+/, ''):s;
}
export function safeURL(value) {
  const s=sitePath(value);
  if (!s || /[\u0000-\u0020\\]/.test(s)) return '';
  if (/^#[\w-]+$/.test(s) || /^\/(?!\/)/.test(s)) return s;
  if (!s.startsWith('//') && !s.includes(':')) return s;
  try { const u=new URL(s); return ['https:','http:','mailto:','tel:'].includes(u.protocol)?s:''; } catch {return '';}
}
const e=escapeHTML;
const size=(value,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):fallback));
const hex=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||'')?value:fallback;
export function imageURL(value){const v=safeURL(value);return v && !/^#|^(?:mailto|tel):/i.test(v)?v:'';}
function pdfURL(value){const v=safeURL(value);return /^assets\/editais\/[^?#]+\.pdf$/i.test(v)?v:'';}
function img(value,alt,cls,extra=''){const url=imageURL(value);return url?`<img src="${e(url)}" alt="${e(alt)}" class="${cls}" ${extra}>`:'';}

function link(label,url,cls='') {const valid=safeURL(url);return valid?`<a class="${e(cls)}" href="${e(valid)}">${e(label)}</a>`:`<span class="${e(cls)}" aria-disabled="true">${e(label)}</span>`;}
function inline(text) {
  // Escapa HTML antes de aplicar o subconjunto de Markdown suportado pelo editor.
  const tokens=[];
  const t=String(text).replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,label,url)=>{const n=tokens.push(link(label,url))-1;return `\uE000${n}\uE001`;});
  return e(t).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>').replace(/\uE000(\d+)\uE001/g,(_,i)=>tokens[Number(i)]||'');
}
export function markdown(text) {
  const lines=String(text??'').replace(/\r/g,'').split('\n');let html='',paragraph=[],list=null;
  const flush=()=>{if(paragraph.length){html+=`<p>${paragraph.map(inline).join('<br>')}</p>`;paragraph=[];}};
  const close=()=>{if(list){html+=`</${list}>`;list=null;}};
  for(const line of lines){const item=line.match(/^\s*(?:([-*])|\d+\.)\s+(.+)$/);
    if(item){flush();const kind=item[1]?'ul':'ol';if(list!==kind){close();html+=`<${kind}>`;list=kind;}html+=`<li>${inline(item[2])}</li>`;continue;}
    close();if(!line.trim()){flush();continue;}
    if(/^## /.test(line)){flush();html+=`<h3>${inline(line.slice(3))}</h3>`;}
    else if(/^> /.test(line)){flush();html+=`<blockquote>${inline(line.slice(2))}</blockquote>`;}
    else paragraph.push(line);
  }flush();close();return html;
}
export function renderPage(data) {
  const g=data.globais,empty=()=>`<p class="empty">${e(g.texto_lista_vazia)}</p>`;
  const title=(d)=>`<div class="section-title"><h2>${e(d.titulo)}</h2>${d.legenda?`<small>${e(d.legenda)}</small>`:''}</div>`;
  const section=(id,body)=>g.exibir_acordeoes===false?`<section class="section" id="${id}">${title(data[id])}${body}</section>`:`<details class="program-panel" id="${id}" ${g.abrir_primeira_secao&&g.secoes?.find(x=>x.visivel!==false)?.secao===id?'open':''}><summary><h2>${e(data[id].titulo)}</h2><span class="expand-icon" aria-hidden="true">+</span></summary><div class="panel-content">${data[id].legenda?`<p class="caption">${e(data[id].legenda)}</p>`:''}${body}</div></details>`;
  const button=(label,url,cls='button')=>link(label,url,cls);
  const lattes=(url)=>/^https?:\/\/lattes\.cnpq\.br\/\d{16}\/?$/.test(url||'')?url:'';
  const slides=data.carrossel.filter(x=>x.publicado!==false).sort((a,b)=>a.ordem-b.ordem);
  const banner=slides.length?`<section class="banner" aria-roledescription="carrossel" aria-label="Destaques" data-interval="${Number(g.carrossel_intervalo)||7}" data-auto="${g.carrossel_automatico===true}">${slides.map((s,i)=>{
    const mode=imageURL(s.imagem)&&['lado','fundo','imagem'].includes(s.modo)?s.modo:'texto';
    const position=['center','top','bottom','left','right'].includes(s.posicao_imagem)?s.posicao_imagem:'center';
    const picture=img(s.imagem,s.imagem_alt||s.title,'banner-image',`style="object-position:${position}" ${i?'loading="lazy"':'fetchpriority="high"'}`);
    const text=`<div class="slide-copy"><div class="eyebrow">${e(s.etiqueta)}</div><h2>${e(s.title)}</h2><p>${e(s.description)}</p>${s.button_text?button(s.button_text,s.button_link):''}</div>`;
    const imageOnly=safeURL(s.button_link)?`<a class="banner-image-link" href="${e(safeURL(s.button_link))}" aria-label="${e(s.button_text||s.title)}">${picture}</a>`:picture;
    return `<div class="slide mode-${mode}" style="--overlay:${size(s.sobreposicao,0,90,60)/100}"${i?' hidden':''}>${mode==='imagem'?imageOnly:mode==='fundo'?picture+text:mode==='lado'?text+picture:text}</div>`;
  }).join('')}${slides.length>1?`<div class="carousel-controls">${slides.map((_,i)=>`<button class="dot" aria-label="Destaque ${i+1}" aria-current="${i===0}"></button>`).join('')}<div class="arrows"><button class="icon-button pause" id="pause" data-play="${e(g.texto_reproduzir)}" data-pause="${e(g.texto_pausar)}">${e(g.texto_pausar)}</button><button class="icon-button" id="prev" aria-label="Destaque anterior">‹</button><button class="icon-button" id="next" aria-label="Próximo destaque">›</button></div></div>`:''}</section>`:'';
  const news=data.noticias.filter(n=>n.publicado!==false).sort((a,b)=>b.date.localeCompare(a.date));
  const newsMarkup=`<section class="section" id="noticias">${title({titulo:g.noticias_titulo,legenda:g.noticias_legenda})}${news.length?news.map(n=>{const dt=new Date(n.date+'T12:00:00Z'),valid=!Number.isNaN(dt.valueOf());return `<article class="news-item"><div class="date">${valid?`<time datetime="${e(n.date)}"><strong>${dt.getUTCDate().toString().padStart(2,'0')}</strong>${dt.toLocaleString('pt-BR',{month:'short',timeZone:'UTC'}).replace('.','').toUpperCase()}<br>${dt.getUTCFullYear()}</time>`:''}</div><div>${img(n.imagem,n.imagem_alt,'news-image','loading="lazy"')}<span class="tag">${e(n.categoria)}</span><h3>${n.link?link(n.title,n.link):e(n.title)}</h3><div class="rich-text">${markdown(n.body)}</div></div></article>`;}).join(''):`<p class="empty">${e(g.noticias_vazio)}</p>`}</section>`;
  const c=data.coordenacao;
  const coord=section('coordenacao',`<div class="coordinator">${img(c.foto,c.foto_alt,'coordinator-photo','loading="lazy"')}<div><h3>${e(c.nome)}</h3><p>${e(c.cargo)}</p></div>${lattes(c.lattes)?button(g.texto_lattes,c.lattes):`<span class="caption">${e(g.texto_link_indisponivel)}</span>`}</div>`);
  const os=data.orientadores.lista;
  const orient=section('orientadores',os.length?`<div class="table-wrap"><table><thead><tr><th scope="col">${e(g.texto_professor)}</th><th scope="col">${e(g.texto_area)}</th><th scope="col">${e(g.texto_curriculo)}</th></tr></thead><tbody>${os.map(o=>`<tr><td>${e(o.nome)}</td><td>${e(o.area)}</td><td>${lattes(o.lattes)?button(g.texto_lattes_mini,o.lattes,'button mini'):e(g.texto_nao_informado)}</td></tr>`).join('')}</tbody></table></div>`:empty());
  const people=id=>section(id,data[id].lista.length?`<ul class="people">${data[id].lista.map(p=>`<li>${e(p.nome)}${p.curso?`<small>${e(p.curso)}</small>`:''}</li>`).join('')}</ul>`:empty());
  const projects=section('projetos',data.projetos.lista.length?`<div class="projects">${data.projetos.lista.map(p=>`<article class="project"><span class="tag">${e(p.etiqueta)}</span><h3>${e(p.titulo)}</h3><p><strong>${e(g.texto_orientador)}:</strong> ${e(p.orientador)}</p><p><strong>${e(g.texto_area)}:</strong> ${e(p.area)}</p><p>${e(p.descricao)}</p></article>`).join('')}</div>`:empty());
  const production=section('producao',data.producao.lista.length?data.producao.lista.map(p=>`<article class="publication"><span class="tag">${e(p.tipo)}</span><h3>${e(p.titulo)}</h3><p>${e(p.referencia)}</p>${p.link?link(p.botao,p.link):''}</article>`).join(''):empty());
  const proc=data['processo-seletivo'];
  const selection=section('processo-seletivo',`<p>${e(proc.descricao)}</p>${proc.cronograma.length?`<div class="table-wrap"><table><thead><tr><th scope="col">${e(g.texto_etapa)}</th><th scope="col">${e(g.texto_periodo)}</th></tr></thead><tbody>${proc.cronograma.map(t=>`<tr><td>${e(t.etapa)}</td><td>${e(t.periodo)}</td></tr>`).join('')}</tbody></table></div>`:empty()}<h3 id="editais">${e(proc.titulo_editais)}</h3><div class="documents">${proc.editais.length?proc.editais.map(f=>button(f.titulo+' · PDF',pdfURL(f.arquivo))).join(''):`<p class="caption">${e(g.texto_sem_editais)}</p>`}</div>`);
  const forms=section('formularios',`<p>${e(data.formularios.descricao)}</p><div class="documents">${data.formularios.lista.length?data.formularios.lista.map(f=>button(f.titulo,f.link,'button mini')).join(''):empty()}</div>`);
  const contact=data.contato;
  const contacts=section('contato',`<div class="contact"><strong>${e(contact.titulo_contato)}</strong>${[['rotulo_email','email'],['rotulo_telefone','telefone'],['rotulo_atendimento','atendimento']].map(([a,b])=>contact[b]?`<p>${e(contact[a])}: ${e(contact[b])}</p>`:'').join('')}</div>`);
  const blocks={noticias:newsMarkup,objetivos:section('objetivos',`<div class="rich-text">${markdown(data.objetivos.texto)}</div>`),coordenacao:coord,orientadores:orient,bolsistas:people('bolsistas'),voluntarios:people('voluntarios'),projetos:projects,producao:production,'processo-seletivo':selection,formularios:forms,contato:contacts};
  const order=Array.isArray(g.secoes)?g.secoes:Object.keys(blocks).map(secao=>({secao,visivel:true}));
  const visible=new Set(order.filter(x=>x.visivel!==false&&blocks[x.secao]).map(x=>x.secao));
  const used=new Set();const content=order.filter(x=>visible.has(x.secao)&&!used.has(x.secao)&&used.add(x.secao)).map(x=>blocks[x.secao]).join('');
  const validNav=x=>!String(x.link).startsWith('#')||['#inicio','#conteudo'].includes(x.link)||visible.has(x.link.slice(1))||(x.link==='#editais'&&visible.has('processo-seletivo'));
  const socials=Array.isArray(g.redes_sociais)?g.redes_sociais.filter(s=>s&&safeURL(s.url)):[];
  const socialMarkup=socials.length?`<div class="social-links" aria-label="Redes sociais">${socials.map(s=>`<a class="social-link" href="${e(safeURL(s.url))}" aria-label="${e(s.nome||'Rede social')}" rel="noopener">${e(s.icone||String(s.nome||'').slice(0,2).toUpperCase())}</a>`).join('')}</div>`:'';
  const logo=img(g.logo_imagem,g.logo_alt,'main-logo',`width="${size(g.logo_largura,60,280,144)}" height="${size(g.logo_altura,48,200,144)}"`)||`<span class="wordmark" id="logo-principal">${e(g.logo_principal)}</span>`;
  const secondaryLogo=img(g.logo_secundaria_imagem,g.logo_secundaria_alt,'secondary-logo',`width="${size(g.logo_secundaria_largura,60,250,148)}" height="${size(g.logo_secundaria_altura,40,160,72)}"`)||`<span id="logo-secundaria">${e(g.logo_secundaria)}</span>`;
  const font={Arial:'Arial,Helvetica,sans-serif',Georgia:'Georgia,serif',Verdana:'Verdana,sans-serif'}[g.fonte]||'Arial,Helvetica,sans-serif';
  const variables=`--royal:${hex(g.cor_principal,'#0056b3')};--navy:${hex(g.cor_escura,'#082d66')};--page-bg:${hex(g.cor_fundo,'#ffffff')};--ink:${hex(g.cor_texto,'#24364b')};--font:${font};--max-width:${size(g.largura_site,960,1440,1240)}px;--side-width:${size(g.largura_menu,200,300,248)}px;--banner-height:${size(g.altura_banner,260,600,330)}px`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(g.titulo_pagina)}</title><meta name="description" content="${e(g.descricao_pagina)}">
<link rel="stylesheet" href="style.css"><style>:root{${variables}}</style>
<!-- Gerado por build.mjs a partir dos arquivos editados pelo Decap. -->
</head><body id="inicio">
<a class="skip" href="#conteudo">${e(g.texto_pular)}</a>
<header class="site-header"><div class="wrap header-row"><a href="#inicio" class="brand">${logo}<div class="header-identity"><strong>${secondaryLogo}</strong><span id="slogan-titulo">${e(g.slogan_titulo)}</span></div></a><nav class="header-nav" aria-label="Navegação principal">${g.menu_superior.filter(validNav).map(x=>link(x.texto,x.link)).join('')}</nav>${socialMarkup}<a class="admin-access" href="admin/">${e(g.menu_admin)}</a></div></header>
<div class="breadcrumb-band"><div class="wrap"><span>${link(g.texto_inicio,'#inicio')} <span aria-hidden="true">/</span> ${e(g.logo_principal)}</span><small>${e(g.faixa_direita)}</small></div></div>
<div class="wrap page-heading"><h1>${e(g.titulo_conteudo)}</h1><p id="slogan-subtitulo">${e(g.slogan_subtitulo)}</p></div>
<div class="wrap reference-layout ${g.exibir_menu_lateral===false?'no-sidebar':''}"><main id="conteudo">${banner}${g.aviso_demonstracao?`<p class="demo-note">${e(g.aviso_demonstracao)}</p>`:''}${g.exibir_chamada?`<section class="join"><h2>${e(g.chamada_titulo)}</h2><p>${e(g.chamada_texto)}</p>${button(g.chamada_botao,g.chamada_link,'button pill')}</section>`:''}<div class="program-sections">${content}</div></main>
${g.exibir_menu_lateral===false?'':`<aside class="results-sidebar" aria-label="Resultados e editais"><h2>${e(data.resultados.titulo)}</h2><div class="results-list">${data.resultados.documentos?.length?data.resultados.documentos.map(d=>`<article class="result-item"><span class="pdf-badge" aria-hidden="true">PDF</span><div>${pdfURL(d.arquivo)?link(d.titulo,d.arquivo):`<span>${e(d.titulo)}</span>`}${d.descricao?`<small>${e(d.descricao)}</small>`:''}</div></article>`).join(''):`<p>${e(data.resultados.mensagem_vazia)}</p>`}</div></aside>`}</div>
<footer><div class="wrap"><div><strong>${e(g.rodape_titulo)}</strong><br>${e(g.rodape_texto)}<br><small>${e(g.faixa_esquerda)}</small></div><div class="footer-note">${e(g.rodape_nota)}<br><a href="admin/">${e(g.menu_admin)}</a></div></div></footer>
${g.mostrar_whatsapp&&safeURL(g.whatsapp_link)?`<a class="whatsapp-float" href="${e(safeURL(g.whatsapp_link))}" aria-label="${e(g.whatsapp_texto||'Fale conosco pelo WhatsApp')}" rel="noopener">${e(g.whatsapp_rotulo||'WhatsApp')}</a>`:''}
<script src="site.js" defer></script>
</body></html>`;
}
