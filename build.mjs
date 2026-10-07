import {readFile,writeFile,readdir,mkdir,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {renderPage} from './render.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=async name=>JSON.parse(await readFile(path.join(root,name),'utf8'));
export async function loadData(){
  const data={};
  for(const name of (await readdir(path.join(root,'data'))).filter(n=>n.endsWith('.json')).sort()) data[name.slice(0,-5)]=await read('data/'+name);
  for(const name of ['carrossel','noticias']){data[name]=[];for(const f of (await readdir(path.join(root,'content',name))).filter(n=>n.endsWith('.json')).sort())data[name].push(await read('content/'+name+'/'+f));}
  // Um arquivo malformado interrompe o build, preservando a última publicação válida.
  for(const id of ['globais','objetivos','coordenacao','orientadores','bolsistas','voluntarios','projetos','producao','processo-seletivo','formularios','contato','resultados'])if(!data[id])throw new Error('Arquivo obrigatório ausente: data/'+id+'.json');
  for(const id of ['orientadores','bolsistas','voluntarios','projetos','producao','formularios'])data[id].lista??=[];
  data['processo-seletivo'].editais??=[];data['processo-seletivo'].cronograma??=[];
  data.globais.menu_superior??=[];data.globais.menu_lateral??=[];
  for(const n of data.noticias)if(!/^\d{4}-\d{2}-\d{2}$/.test(n.date))throw new Error('Data inválida na notícia: '+n.title);
  return data;
}
export async function build(){
  const data=await loadData(),html=renderPage(data),dist=path.join(root,'dist');
  await mkdir(dist,{recursive:true});
  await writeFile(path.join(root,'index.html'),html); // Prévia completa, pronta para abrir.
  await writeFile(path.join(dist,'index.html'),html);
  for(const name of ['style.css','site.js','admin','assets'])await cp(path.join(root,name),path.join(dist,name),{recursive:true});
  let config=await readFile(path.join(dist,'admin/config.yml'),'utf8');
  const parseRepository=value=>{
    let repo=String(value??'').trim();
    if(!repo)return '';
    repo=repo.replace(/^git\+?/i,'');
    repo=repo.replace(/^git@github\.com:/i,'');
    repo=repo.replace(/^ssh:\/\/git@github\.com\//i,'');
    repo=repo.replace(/^https?:\/\/github\.com\//i,'');
    repo=repo.replace(/\.git\/?$/i,'').replace(/^\/+|\/+$/g,'');
    return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)?repo:'';
  };
  const configuredRepo=parseRepository(process.env.GITHUB_REPOSITORY);
  const detectedRepo=parseRepository(process.env.REPOSITORY_URL);
  const repo=configuredRepo||detectedRepo;
  if(repo)config=config.replace('SEU_USUARIO/SEU_REPOSITORIO',repo);
  else if(process.env.GITHUB_REPOSITORY||process.env.REPOSITORY_URL)console.warn('Repositório GitHub não identificado; o site foi gerado, mas o painel ainda precisa da configuração do repositório.');
  const origin=String(process.env.URL??'').trim();
  if(origin){try{const url=new URL(origin);if(['http:','https:'].includes(url.protocol)){config+='\nsite_url: '+JSON.stringify(url.origin)+'\ndisplay_url: '+JSON.stringify(url.origin)+'\n';}else console.warn('URL ignorada: use um endereço HTTP(S) válido.');}catch{console.warn('URL ignorada: use um endereço HTTP(S) válido.');}}
  await writeFile(path.join(dist,'admin/config.yml'),config);
  await cp(path.join(root,'GUIA_NETLIFY.html'),path.join(dist,'guia.html'));
  console.log('PROINC gerado: dist/index.html. '+data.carrossel.length+' banners e '+data.noticias.length+' notícias cadastrados.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await build();
