import { createServer } from 'vite';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const vite = await createServer({ configFile:false, resolve:{alias:{'@':new URL('./src',import.meta.url).pathname}}, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
 const {profile, experiences} = await vite.ssrLoadModule('/src/data/profile.ts');
 const {workProjects} = await vite.ssrLoadModule('/src/data/workProjects.ts');
 const {caseStudies} = await vite.ssrLoadModule('/src/data/caseStudies.ts');
 const {expertiseData} = await vite.ssrLoadModule('/src/data/expertise.ts');
 const copy = JSON.parse(await (await import("node:fs/promises")).readFile("src/data/siteCopy.json", "utf8"));
 const {publicMetadata: seo,navigation} = await vite.ssrLoadModule("/src/data/siteSettings.ts");
 const content = {seo,navigation,copy,profile, experiences: experiences.map((x,i)=>({id:`experience-${i+1}`,...x})), workProjects, caseStudies, expertiseData};
 const json = JSON.stringify(content, null, 2)+'\n';
 const destination=process.argv[2] || '/tmp/profile-content.json';
 await writeFile(destination,json);
 console.log(`Exported approved public content: sha256 ${createHash('sha256').update(json).digest('hex')}`);
} finally { await vite.close(); }
