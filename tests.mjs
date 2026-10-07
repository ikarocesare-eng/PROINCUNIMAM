import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadData} from './build.mjs';
import {renderPage,safeURL,markdown} from './render.mjs';
const original=await loadData();
const edited=structuredClone(original);edited.globais.logo_imagem='';edited.globais.logo_secundaria_imagem='';
edited.globais.logo_principal='MARCA EDITADA';edited.globais.logo_secundaria='INSTITUIÇÃO EDITADA';edited.globais.slogan_subtitulo='SUBTÍTULO EDITADO';
edited.coordenacao.nome='NOME NOVO';edited.coordenacao.cargo='CARGO NOVO';edited.coordenacao.lattes='https://lattes.cnpq.br/1234567890123456';
edited.carrossel.push({title:'QUARTO BANNER',description:'AVISO NOVO',button_text:'BOTÃO NOVO',button_link:'#contato',ordem:0,publicado:true});
edited.noticias.push({title:'NOVA NOTÍCIA',date:'2026-10-01',body:'**Resumo novo**',categoria:'CATEGORIA NOVA',link:'#projetos',publicado:true});
edited['processo-seletivo'].editais=[{titulo:'EDITAL NOVO',arquivo:'/assets/editais/edital.pdf'}];
let html=renderPage(edited);
for(const text of ['MARCA EDITADA','INSTITUIÇÃO EDITADA','SUBTÍTULO EDITADO','NOME NOVO','CARGO NOVO','QUARTO BANNER','AVISO NOVO','BOTÃO NOVO','NOVA NOTÍCIA','<strong>Resumo novo</strong>','EDITAL NOVO','href="assets/editais/edital.pdf"','href="https://lattes.cnpq.br/1234567890123456"'])assert.ok(html.includes(text),text);
assert.ok(html.indexOf('QUARTO BANNER')<html.indexOf('A próxima descoberta'));
assert.ok(html.indexOf('NOVA NOTÍCIA')<html.indexOf('PROINC abre seleção'));
for(const n of [0,1,5]){
 const d=structuredClone(original);d.carrossel=Array.from({length:n},(_,i)=>({...original.carrossel[0],ordem:i,title:'SLIDE '+i}));
 const output=renderPage(d);assert.equal((output.match(/class="slide mode-/g)||[]).length,n);assert.equal(output.includes('id="pause"'),n>1);
}
const blank=structuredClone(original);blank.carrossel=[];blank.noticias=[];
for(const id of ['orientadores','bolsistas','voluntarios','projetos','producao','formularios'])blank[id].lista=[];
blank['processo-seletivo'].cronograma=[];blank['processo-seletivo'].editais=[];
assert.ok(renderPage(blank).includes(blank.globais.noticias_vazio));
const hidden=structuredClone(original);hidden.carrossel[0].publicado=false;hidden.noticias[0].publicado=false;
assert.ok(!renderPage(hidden).includes(original.carrossel[0].title));
assert.ok(!renderPage(hidden).includes(original.noticias[0].title));
assert.equal(safeURL('javascript:alert(1)'), '');assert.equal(safeURL('//host.example'), '');assert.equal(safeURL('data:text/html,evil'), '');assert.equal(safeURL('/\\evil'), '');
assert.ok(!markdown('<img src=x onerror=alert(1)>').includes('<img'));
assert.ok(!markdown('[Ataque](javascript:alert(1))').includes('href="javascript:'));
edited.coordenacao.nome='<script>alert(1)</script>';assert.ok(renderPage(edited).includes('&lt;script&gt;'));
const clean=renderPage(original),ids=[...clean.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);
for(const [,id] of clean.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(id),'Âncora inexistente: '+id);
console.log('OK: edição de campos, ordenação, 0/1/5 banners, exclusões, rascunhos, PDFs, Markdown, links seguros e âncoras.');

const custom=structuredClone(original);
custom.globais.logo_imagem='/assets/img/logo-nova.png';custom.globais.logo_largura=200;
custom.globais.logo_secundaria_imagem='/assets/img/outra.png';custom.globais.exibir_menu_lateral=false;
custom.globais.secoes=[{secao:'coordenacao',visivel:true},{secao:'noticias',visivel:true},{secao:'orientadores',visivel:false}];
let out=renderPage(custom);assert.ok(out.includes('src="assets/img/logo-nova.png"'));assert.ok(out.includes('width="200"'));assert.ok(out.includes('src="assets/img/outra.png"'));assert.ok(!out.includes('id="orientadores"'));assert.ok(!out.includes('href="#orientadores"'));assert.ok(out.includes('no-sidebar'));
assert.ok(out.indexOf('id="coordenacao"')<out.indexOf('id="noticias"'));
for(const mode of ['texto','lado','fundo','imagem']){custom.carrossel=[{...original.carrossel[0],modo:mode,imagem:'/assets/img/teste.png',sobreposicao:0}];out=renderPage(custom);assert.ok(out.includes('mode-'+mode));assert.ok(out.includes('--overlay:0'));}
console.log('OK: logos, dimensões, modos de imagem, opacidade zero, ordem/visibilidade e menus.');
const reference=structuredClone(original);reference.exibir_acordeoes=true;
assert.ok(renderPage(reference).includes('<details class="program-panel"'));
reference.globais.exibir_acordeoes=false;assert.ok(!renderPage(reference).includes('<details class="program-panel"'));
reference.resultados.documentos=[{titulo:'DOCUMENTO LATERAL',arquivo:'/assets/editais/lateral.pdf',descricao:'Atualizado'}];
assert.ok(renderPage(reference).includes('href="assets/editais/lateral.pdf"'));
assert.ok(renderPage(reference).includes('DOCUMENTO LATERAL'));
console.log('OK: seções expansíveis e documentos na coluna de resultados.');
