import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const db=new PrismaClient(),ids=[],base=process.env.APP_URL||'http://localhost:3000';
const unique=randomBytes(6).toString('hex'),email=`login-${unique}@example.test`,password=randomBytes(16).toString('hex'),otherPassword=randomBytes(16).toString('hex');
function hash(value){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(value,salt,64).toString('hex');}
async function store(suffix,pass){const merchant=await db.merchant.create({data:{name:'Login test '+suffix,slug:'login-'+unique+'-'+suffix,notifications:{create:{}},users:{create:{name:'Login test',email,password:hash(pass),role:'OWNER'}}}});ids.push(merchant.id);return merchant;}
async function login(body){return fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)});}
let browser;
try{
 const first=await store('a',password),second=await store('b',otherPassword);
 let response=await login({email:email.toUpperCase(),password});assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0];
 let me=await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}});assert.equal((await me.json()).data.merchant.id,first.id);
 response=await login({email,password:otherPassword});assert.equal(response.status,200);me=await fetch(base+'/api/auth/me',{headers:{Cookie:response.headers.get('set-cookie').split(';')[0]}});assert.equal((await me.json()).data.merchant.id,second.id);
 response=await login({email,password:'wrong-password'});assert.equal(response.status,401);assert.equal(response.headers.get('set-cookie'),null);
 const third=await store('c',password);response=await login({email,password});assert.equal(response.status,200);assert.equal(response.headers.get('set-cookie'),null);const choices=(await response.json()).data.stores;assert.deepEqual(new Set(choices.map(s=>s.slug)),new Set([first.slug,third.slug]));
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();await page.goto(base+'/entrar');assert.equal(await page.locator('input[name="slug"]').count(),0);await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByLabel('Escolha a loja').selectOption(third.slug);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL(base+'/painel');
 me=await page.request.get(base+'/api/auth/me');assert.equal((await me.json()).data.merchant.id,third.id);
 await page.goto(base+'/cadastro');assert.equal(await page.locator('input[name="slug"]').count(),1);
 console.log('Login passed: email/password only, case normalization, wrong password rejection, duplicate email isolation, store selection and signup slug preserved.');
}finally{await browser?.close();await db.merchant.deleteMany({where:{id:{in:ids}}});await db.$disconnect();}
