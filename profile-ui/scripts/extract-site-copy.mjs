// Run deliberately when adding public copy. Existing identifiers are preserved on reruns.
import ts from 'typescript';
import { readFile,writeFile } from 'node:fs/promises';
const files=['pages/HomePage.tsx','pages/AboutPage.tsx','pages/WorkPage.tsx','pages/PrivacyPage.tsx','pages/TermsAndConditions.tsx','pages/ContactPage.tsx','components/HeroSection.tsx','components/Header.tsx','components/Footer.tsx','components/MainMenu.tsx','components/MobileMenu.tsx'];
let copy={};try{copy=JSON.parse(await readFile('src/data/siteCopy.json','utf8'));}catch{}
function jsxText(text){const lines=text.replace(/\r/g,'').split('\n');let last=-1;lines.forEach((l,i)=>{if(l.trim())last=i;});return lines.map((l,i)=>{l=l.replace(/\t/g,' ');if(i)l=l.replace(/^ +/,'');if(i<lines.length-1)l=l.replace(/ +$/,'');return l+(l&&i<last?' ':'');}).join('');}
for(const file of files){let source=await readFile('src/'+file,'utf8');const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const edits=[];let index=0;
 function visit(node){if(ts.isJsxText(node)&&node.getText(ast).trim()){let id=file.replace('.tsx','').replaceAll('/','.')+'.text.'+(++index);while(copy[id])id+='n';const value=jsxText(node.getText(ast));copy[id]=value;edits.push([node.pos,node.end,`<SiteText id="${id}" />`]);}ts.forEachChild(node,visit);}visit(ast);
 if(edits.length){for(const [start,end,text] of edits.reverse())source=source.slice(0,start)+text+source.slice(end);source='import { SiteText } from "@/content/SiteContent";\n'+source;await writeFile('src/'+file,source);}
}
await writeFile('src/data/siteCopy.json',JSON.stringify(copy,null,2)+'\n');console.log(Object.keys(copy).length+' editable public text fields');
