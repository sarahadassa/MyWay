import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, deleteDoc, updateDoc, query, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Config - Configurações do Firebase para conectar o app ao projeto no console do Firebase. Contém chaves e identificadores únicos que permitem autenticação e acesso ao banco de dados Firestore.

const firebaseConfig = {
  apiKey: "AIzaSyCGfBv2-jMES3oO6FKJZfmND0WmLQXBCyU",
  authDomain: "myway-14fc3.firebaseapp.com",
  projectId: "myway-14fc3",
  storageBucket: "myway-14fc3.firebasestorage.app",
  messagingSenderId: "501109982710",
  appId: "1:501109982710:web:33ed9300843fb0e975f3d7"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const CLOUD_NAME    = "dt88i9c7n";
const UPLOAD_PRESET = "myway-web";

window.flash = function(msg, tipo = 'erro') {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed', bottom: '24px', right: '24px',
    background: tipo === 'sucesso' ? '#16A34A' : '#111111',
    color: 'white', padding: '12px 20px', borderRadius: '10px',
    fontSize: '14px', fontFamily: "'DM Sans', sans-serif",
    zIndex: '9999', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    maxWidth: '320px'
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// Estado - Guarda tudo que o usuário preenche para renderizar e salvar no Firebase

let uid    = null;
let estado = {
  perfil:       {},
  habilidades:  [],
  projetos:     [],
  certificados: [],
  experiencias: []
};

// Auth listener - Fica de olho na autenticação do usuário para carregar os dados do Firebase quando fizer login, ou limpar tudo quando fizer logout. Garante que o usuário veja as informações corretas e mantenha a sessão ativa.

onAuthStateChanged(auth, async (user) => {
  if (user) {
    uid = user.uid;
    await carregarTudoDoFirebase();
    mostrarTela('dashboard');
    atualizarCabecalho();
    renderizarTudo();
    mostrarSecao('meu-portfolio');
    atualizarLinkPortfolio();
  } else {
    uid = null;
    mostrarTela('auth');
  }
});

// Auth - funções para login, cadastro, logout e troca de abas entre login e cadastro. Usa Firebase Authentication para gerenciar usuários e sessões de forma segura e fácil.

let modoAuth = 'login';

window.trocarTab = (modo) => {
  modoAuth = modo;
  document.getElementById('tab-login').classList.toggle('active', modo === 'login');
  document.getElementById('tab-cadastro').classList.toggle('active', modo === 'cadastro');
  document.getElementById('campos-cadastro').style.display = modo === 'cadastro' ? 'block' : 'none';
  document.getElementById('auth-subtitulo').textContent = modo === 'login' ? 'Entre na sua conta' : 'Crie sua conta grátis';
  document.getElementById('btn-auth').textContent = modo === 'login' ? 'Entrar →' : 'Criar conta →';
  document.getElementById('auth-erro').textContent = '';
};

window.acaoAuth = async () => {
  const email  = document.getElementById('input-email').value.trim();
  const senha  = document.getElementById('input-senha').value;
  const erroEl = document.getElementById('auth-erro');
  erroEl.textContent = '';

  if (!email || !senha) { erroEl.textContent = 'Preencha e-mail e senha.'; return; }

  const btn = document.getElementById('btn-auth');
  btn.disabled = true; btn.textContent = 'Aguarde...';

  try {
    if (modoAuth === 'cadastro') {
      const nome = document.getElementById('input-nome').value.trim();
      const area = document.getElementById('input-area').value.trim();
      if (!nome) { erroEl.textContent = 'Digite seu nome.'; btn.disabled = false; btn.textContent = 'Criar conta →'; return; }
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        perfil: { nome, area, bio: '', linkedin: '', github: '', fotoUrl: '' },
        habilidades: []
      });
    } else {
      await signInWithEmailAndPassword(auth, email, senha);
    }
  } catch (e) {
    btn.disabled = false;
    btn.textContent = modoAuth === 'login' ? 'Entrar →' : 'Criar conta →';
    erroEl.textContent = traduzirErroFirebase(e.code);
  }
};

function traduzirErroFirebase(code) {
  const m = {
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/invalid-email':        'E-mail inválido.',
    'auth/weak-password':        'Senha fraca (mínimo 6 caracteres).',
    'auth/user-not-found':       'Usuário não encontrado.',
    'auth/wrong-password':       'Senha incorreta.',
    'auth/invalid-credential':   'E-mail ou senha incorretos.',
    'auth/too-many-requests':    'Muitas tentativas. Aguarde alguns minutos.',
  };
  return m[code] || 'Erro ao autenticar. Tente novamente.';
}

window.sair = async () => {
  await signOut(auth);
  estado = { perfil: {}, habilidades: [], projetos: [], certificados: [], experiencias: [] };
  mostrarTela('auth');
};

// Firestore: funções para carregar, salvar, atualizar e excluir dados do Firebase. Cada seção (perfil, habilidades, projetos, certificados, experiências) tem suas próprias funções para lidar com as operações de CRUD.

async function carregarTudoDoFirebase() {
  try {
    const snap = await getDoc(doc(db, 'usuarios', uid));
    if (snap.exists()) {
      const d = snap.data();
      estado.perfil      = d.perfil      || {};
      estado.habilidades = d.habilidades || [];
    }
    estado.projetos      = await carregarColecao('projetos');
    estado.certificados  = await carregarColecao('certificados');
    estado.experiencias  = await carregarColecao('experiencias');
  } catch (e) { console.error('Erro ao carregar:', e); }
}

async function carregarColecao(nome) {
  const q    = query(collection(db, 'usuarios', uid, nome), orderBy('criadoEm', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Perfil - Permite editar informações pessoais como nome, área de atuação, bio e links para LinkedIn e GitHub. Essas informações aparecem no portfólio para apresentar o usuário aos visitantes.

let timerPerfil = null;

async function salvarPerfilNoFirebase() {
  if (!uid) return;
  await setDoc(doc(db, 'usuarios', uid), {
    perfil:      estado.perfil,
    habilidades: estado.habilidades
  }, { merge: true });
}

window.salvarPerfil = () => {
  estado.perfil.nome     = document.getElementById('perfil-nome').value;
  estado.perfil.area     = document.getElementById('perfil-area').value;
  estado.perfil.bio      = document.getElementById('perfil-bio').value;
  estado.perfil.linkedin = document.getElementById('perfil-linkedin').value.trim()
  .replace(/^https?:\/\/(www\.)?linkedin\.com\/in\/?/, '').replace(/\/$/, '');
  estado.perfil.github   = document.getElementById('perfil-github').value.trim()
  .replace(/^https?:\/\/(www\.)?github\.com\/?/, '').replace(/\/$/, '');

  atualizarCabecalho();

  clearTimeout(timerPerfil);
  timerPerfil = setTimeout(() => {
    renderizarPreviewPortfolio();
    salvarPerfilNoFirebase();
  }, 500);
};

// Upload de foto - Envia a imagem para a nuvem e guarda o link no Firebase. Usa Cloudinary para hospedagem rápida e gratuita de imagens

window.handleFotoUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 3 * 1024 * 1024) {
    flash('Imagem muito grande. Máximo: 3 MB.');
    return;
  }

  try {
    flash('Enviando imagem...');

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    const data = await response.json();

    if (!data.secure_url) throw new Error("Falha no upload");

    estado.perfil.fotoUrl = data.secure_url;
    await salvarPerfilNoFirebase();

    atualizarCabecalho();
    renderizarFotosPerfil();
    renderizarPreviewPortfolio();

    document.getElementById('btn-remover-foto').style.display = 'inline-flex';
    flash('Foto atualizada! ✓', 'sucesso');
  } catch (erro) {
    console.error(erro);
    flash('Erro ao enviar imagem.');
  }

  event.target.value = '';
};

window.removerFoto = async () => {
  estado.perfil.fotoUrl = '';
  await salvarPerfilNoFirebase();
  atualizarCabecalho();
  renderizarFotosPerfil();
  renderizarPreviewPortfolio();
  document.getElementById('btn-remover-foto').style.display = 'none';
  flash('Foto removida.', 'sucesso');
};

function renderizarFotosPerfil() {
  const url      = estado.perfil.fotoUrl;
  const nome     = estado.perfil.nome || '';
  const iniciais = nome.split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase() || '?';

  const preview = document.getElementById('foto-preview-el');
  if (preview) {
    preview.innerHTML = url
      ? `<img src="${escapeHtml(otimizarImagem(url, 100))}" alt="Foto de perfil" />`
      : iniciais;
  }
}

// Habilidades - Permite adicionar habilidades técnicas ou interpessoais, com nome e opção de destacar no portfólio. Essas habilidades aparecem no portfólio para mostrar os pontos fortes do usuário.

window.adicionarHabilidade = async () => {
  const input = document.getElementById('input-habilidade');
  const nome  = input.value.trim();
  if (!nome) return;
  if (estado.habilidades.some(h => h.nome.toLowerCase() === nome.toLowerCase())) {
    flash('Habilidade já adicionada!'); input.value = ''; return;
  }
  estado.habilidades.push({ id: gerarId(), nome });
  await salvarPerfilNoFirebase();
  renderizarHabilidades();
  renderizarPreviewPortfolio();
  input.value = '';
};

window.removerHabilidade = async (id) => {
  estado.habilidades = estado.habilidades.filter(h => h.id !== id);
  await salvarPerfilNoFirebase();
  renderizarHabilidades();
  renderizarPreviewPortfolio();
};

function renderizarHabilidades() {
  const lista = document.getElementById('lista-habilidades');
  if (estado.habilidades.length === 0) {
    lista.innerHTML = '<p style="font-size:13px;color:var(--texto3)">Nenhuma habilidade adicionada.</p>';
    return;
  }
  lista.innerHTML = estado.habilidades.map(h => `
    <span class="tag">${escapeHtml(h.nome)}
      <button onclick="removerHabilidade('${h.id}')" title="Remover">×</button>
    </span>
  `).join('');
}

// Projetos - Permite adicionar projetos pessoais ou profissionais, com nome, descrição, tecnologias usadas, links e opção de destacar no portfólio. Esses projetos aparecem no portfólio para mostrar as realizações do usuário.

window.adicionarProjeto = async () => {
  const nome = document.getElementById('proj-nome').value.trim();
  const desc = document.getElementById('proj-desc').value.trim();
  if (!nome || !desc) { flash('Preencha nome e descrição!'); return; }

  const dados = {
    nome, desc,
    tech:      document.getElementById('proj-tech').value.trim(),
    github:    document.getElementById('proj-github').value.trim(),
    url:       document.getElementById('proj-url').value.trim(),
    destaque:  document.getElementById('proj-destaque').checked,
    criadoEm: Date.now()
  };

   try {
    const refDoc = await addDoc(collection(db, 'usuarios', uid, 'projetos'), dados);
    estado.projetos.unshift({ id: refDoc.id, ...dados });
    renderizarProjetos();
    renderizarPreviewPortfolio();
    limparCampos(['proj-nome','proj-desc','proj-tech','proj-github','proj-url']);
    document.getElementById('proj-destaque').checked = false;
    flash('Projeto salvo! ✓', 'sucesso');
 } catch (e) {
    flash('Erro ao salvar projeto. Tente novamente.');
  }
};

window.removerProjeto

window.removerProjeto = async (id) => {
  if (!confirm('Deseja excluir este projeto?')) return;
  try {
    await deleteDoc(doc(db, 'usuarios', uid, 'projetos', id));
    estado.projetos = estado.projetos.filter(p => p.id !== id);
    renderizarProjetos();
    renderizarPreviewPortfolio();
  } catch (e) {
    flash('Erro ao excluir projeto. Tente novamente.');
  }
};

window.toggleDestaque = async (id) => {
  const proj = estado.projetos.find(p => p.id === id);
  if (!proj) return;
  proj.destaque = !proj.destaque;
  await updateDoc(doc(db, 'usuarios', uid, 'projetos', id), { destaque: proj.destaque });
  renderizarProjetos();
  renderizarPreviewPortfolio();
  flash(proj.destaque ? '⭐ Projeto fixado em destaque!' : 'Destaque removido.', 'sucesso');
};

function renderizarProjetos() {
  const lista = document.getElementById('lista-projetos');
  if (estado.projetos.length === 0) {
    lista.innerHTML = '<p class="vazio-msg">Nenhum projeto adicionado ainda.</p>'; return;
  }

  const ordenados = [...estado.projetos].sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0));

  lista.innerHTML = ordenados.map(p => `
    <div class="item-card ${p.destaque ? 'destaque' : ''}">
      ${p.destaque ? `<div class="destaque-badge">⭐ Destaque</div>` : ''}
      <div class="item-card-header">
        <div>
          <div class="item-card-titulo">${escapeHtml(p.nome)}</div>
          ${p.tech ? `<div class="item-card-sub" style="margin-top:4px">${formatarTechs(p.tech)}</div>` : ''}
        </div>
        <div class="item-card-actions">
          <button class="btn-destaque ${p.destaque ? 'ativo' : ''}" onclick="toggleDestaque('${p.id}')">
            ${p.destaque ? '⭐ Destaque' : '☆ Destacar'}
          </button>
          <button class="btn-excluir" onclick="removerProjeto('${p.id}')">Excluir</button>
        </div>
      </div>
      <p class="item-card-desc">${escapeHtml(p.desc)}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        ${p.github ? `<a href="${escapeHtml(p.github)}" target="_blank" rel="noopener" class="link-acao">GitHub ↗</a>` : ''}
        ${p.url    ? `<a href="${escapeHtml(p.url)}"    target="_blank" rel="noopener" class="link-acao">Ver projeto ↗</a>` : ''}
      </div>
    </div>
  `).join('');
}

// Certificados - Permite adicionar certificados de cursos, workshops ou eventos, com nome, instituição, data e imagem do certificado. Esses certificados aparecem no portfólio para mostrar as qualificações do usuário.

window.adicionarCertificado = async () => {
  const nome = document.getElementById('cert-nome').value.trim();
  const inst = document.getElementById('cert-inst').value.trim();
  const arquivo = document.getElementById('cert-imagem').files[0];

  if (!nome || !inst) {
    flash('Preencha nome e instituição!');
    return;
  }

if (arquivo && arquivo.size > 5 * 1024 * 1024) {
  flash('Imagem muito grande. Máximo: 5 MB.');
  return;
}

try {
  let imagemUrl = '';

  if (arquivo) {
    flash('Enviando certificado...');

    const formData = new FormData();
    formData.append("file", arquivo);
    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    const upload = await response.json();

    if (!upload.secure_url) {
      throw new Error('Falha no upload');
    }

    imagemUrl = upload.secure_url;
  }

  const dados = {
    nome,
    inst,
    area: document.getElementById('cert-area').value,
    data: document.getElementById('cert-data').value,
    imagemUrl,
    criadoEm: Date.now()
  };

    const refDoc = await addDoc(
      collection(db, 'usuarios', uid, 'certificados'),
      dados
    );

    estado.certificados.unshift({ id: refDoc.id, ...dados });

    renderizarCertificados();
    renderizarPreviewPortfolio();
    limparCampos(['cert-nome', 'cert-inst', 'cert-data']);
    document.getElementById('cert-area').value = '';
    document.getElementById('cert-imagem').value = '';
    flash('Certificado salvo! ✓', 'sucesso');

  } catch (erro) {
    console.error(erro);
    flash('Erro ao enviar certificado.');
  }
};

window.removerCertificado = async (id) => {
  if (!confirm('Deseja excluir este certificado?')) return;
  try {
    await deleteDoc(doc(db, 'usuarios', uid, 'certificados', id));
    estado.certificados = estado.certificados.filter(c => c.id !== id);
    renderizarCertificados();
    renderizarPreviewPortfolio();
  } catch (e) {
    flash('Erro ao excluir certificado. Tente novamente.');
  }
};

function renderizarCertificados() {
  const lista = document.getElementById('lista-certificados');
  if (estado.certificados.length === 0) {
    lista.innerHTML = '<p class="vazio-msg">Nenhum certificado adicionado ainda.</p>';
    return;
  }

  const icones = {
    'Desenvolvimento Web': '🌐', 'Mobile': '📱', 'Data Science': '📊',
    'Design': '🎨', 'DevOps': '⚙️', 'Idiomas': '🌍', 'Outro': '🏅'
  };

  const corBadge = {
    'Desenvolvimento Web': 'azul', 'Mobile': 'roxo', 'Data Science': 'amber',
    'Design': 'roxo', 'DevOps': 'verde', 'Idiomas': 'verde', 'Outro': ''
  };

  lista.innerHTML = estado.certificados.map(c => {
    const imgOk = typeof c.imagemUrl === 'string' && c.imagemUrl.trim().startsWith('http');
    return `
      <div class="item-card">
        <div class="item-card-header">
          <div style="display:flex;align-items:center;gap:14px">
            ${imgOk
              ? `<img src="${escapeHtml(otimizarImagem(c.imagemUrl, 80))}" alt="Certificado" style="width:42px;height:42px;object-fit:cover;border-radius:8px;" />`
              : `<span style="font-size:24px">${icones[c.area] || '🏆'}</span>`
            }
            <div>
              <div class="item-card-titulo">${escapeHtml(c.nome)}</div>
              <div class="item-card-sub">
                ${escapeHtml(c.inst)}${c.data ? ' · ' + formatarData(c.data) : ''}
              </div>
            </div>
          </div>
          <button class="btn-excluir" onclick="removerCertificado('${c.id}')">Excluir</button>
        </div>
        <div class="item-card-footer">
          ${c.area ? `<span class="badge ${corBadge[c.area] || ''}">${escapeHtml(c.area)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Experiências - Permite adicionar experiências profissionais, acadêmicas, voluntariado ou extracurriculares, com cargo, empresa, período e descrição. Essas experiências aparecem no portfólio para mostrar a trajetória do usuário.

window.adicionarExperiencia = async () => {
  const cargo   = document.getElementById('exp-cargo').value.trim();
  const empresa = document.getElementById('exp-empresa').value.trim();
  if (!cargo || !empresa) { flash('Preencha cargo e empresa!'); return; }

  const dados = {
    cargo, empresa,
    tipo:     document.getElementById('exp-tipo').value,
    inicio:   document.getElementById('exp-inicio').value,
    fim:      document.getElementById('exp-fim').value,
    desc:     document.getElementById('exp-desc').value.trim(),
    criadoEm: Date.now()
  };
  try {
    const refDoc = await addDoc(collection(db, 'usuarios', uid, 'experiencias'), dados);
    estado.experiencias.unshift({ id: refDoc.id, ...dados });
    renderizarExperiencias();
    renderizarPreviewPortfolio();
    limparCampos(['exp-cargo','exp-empresa','exp-inicio','exp-fim','exp-desc']);
    document.getElementById('exp-tipo').value = 'profissional';
    flash('Experiência salva! ✓', 'sucesso');
 } catch (e) {
    flash('Erro ao salvar experiência. Tente novamente.');
  }
};

window.removerExperiencia = async (id) => {
  if (!confirm('Deseja excluir esta experiência?')) return;
  try {
    await deleteDoc(doc(db, 'usuarios', uid, 'experiencias', id));
    estado.experiencias = estado.experiencias.filter(e => e.id !== id);
    renderizarExperiencias();
    renderizarPreviewPortfolio();
  } catch (e) {
    flash('Erro ao excluir experiência. Tente novamente.');
  }
};

function renderizarExperiencias() {
  const lista = document.getElementById('lista-experiencias');
  if (estado.experiencias.length === 0) {
    lista.innerHTML = '<p class="vazio-msg">Nenhuma experiência adicionada ainda.</p>'; return;
  }
  const tipoLabel = { profissional: 'Profissional', academica: 'Acadêmica', voluntario: 'Voluntariado', extracurricular: 'Extracurricular' };
  const tipoCor   = { profissional: 'azul', academica: 'amber', voluntario: 'verde', extracurricular: 'roxo' };

  lista.innerHTML = estado.experiencias.map(e => `
    <div class="item-card">
      <div class="item-card-header">
        <div>
          <div class="item-card-titulo">${escapeHtml(e.cargo)}</div>
          <div class="item-card-sub">${escapeHtml(e.empresa)}</div>
        </div>
        <button class="btn-excluir" onclick="removerExperiencia('${e.id}')">Excluir</button>
      </div>
      <div class="item-card-footer">
        <span class="badge ${tipoCor[e.tipo] || ''}">${tipoLabel[e.tipo] || e.tipo}</span>
        ${e.inicio ? `<span class="badge">${formatarData(e.inicio)} → ${e.fim ? formatarData(e.fim) : 'Atualmente'}</span>` : ''}
      </div>
      ${e.desc ? `<p class="item-card-desc" style="margin-top:10px">${escapeHtml(e.desc)}</p>` : ''}
    </div>
  `).join('');
}

// Preview do portfólio (dashboard) - Renderiza uma prévia do portfólio com base nas informações preenchidas, e calcula a porcentagem de completude do perfil para incentivar o usuário a preencher tudo.

function renderizarPreviewPortfolio() {
  const p        = estado.perfil;
  const nome     = p.nome || '';
  const iniciais = nome.split(' ').slice(0,2).map(x => x[0]).join('').toUpperCase() || '?';

  const pvAvatar = document.getElementById('pv-avatar');
  if (pvAvatar) {
    pvAvatar.innerHTML = p.fotoUrl
      ? `<img src="${escapeHtml(otimizarImagem(p.fotoUrl, 100))}" alt="" />`
      : iniciais;
  }

  const pvNome = document.getElementById('pv-nome');
  const pvArea = document.getElementById('pv-area');
  const pvBio  = document.getElementById('pv-bio');
  if (pvNome) pvNome.textContent = nome || '—';
  if (pvArea) pvArea.textContent = p.area || '';
  if (pvBio)  pvBio.textContent  = p.bio  || '';

  const pvLinks = document.getElementById('pv-links');
  if (pvLinks) {
    const links = [];
    if (p.linkedin) links.push(`<a href="https://www.linkedin.com/in/${escapeHtml(p.linkedin)}" target="_blank" rel="noopener" class="pv-link primario">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
      LinkedIn</a>`);
    if (p.github) links.push(`<a href="https://github.com/${escapeHtml(p.github)}" target="_blank" rel="noopener" class="pv-link secundario">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
      GitHub</a>`);
    pvLinks.innerHTML = links.join('');
  }

  let pct = 0;
  if (p.fotoUrl)                      pct += 10;
  if (p.nome)                         pct += 10;
  if (p.area)                         pct += 10;
  if (p.bio)                          pct += 15;
  if (p.linkedin)                     pct += 5;
  if (p.github)                       pct += 5;
  if (estado.habilidades.length >= 1)  pct += 15;
  if (estado.projetos.length >= 1)     pct += 15;
  if (estado.certificados.length >= 1) pct += 10;
  if (estado.experiencias.length >= 1) pct += 5;

  const pvPct   = document.getElementById('pv-pct');
  const pvBarra = document.getElementById('pv-barra');
  const pvDica  = document.getElementById('pv-dica');
  if (pvPct)   pvPct.textContent    = pct + '%';
  if (pvBarra) pvBarra.style.width  = pct + '%';
  if (pvDica) {
    let dica = '🎉 Perfil completo! Compartilhe seu portfólio.';
    if (pct < 20)       dica = 'Adicione uma foto e preencha seu nome e área.';
    else if (pct < 40)  dica = 'Escreva sua biografia e adicione habilidades.';
    else if (pct < 60)  dica = 'Adicione seus primeiros projetos ao portfólio.';
    else if (pct < 80)  dica = 'Adicione certificados e redes sociais.';
    else if (pct < 100) dica = 'Quase lá! Adicione experiências para completar.';
    pvDica.textContent = dica;
  }

  const pvSkills = document.getElementById('pv-skills');
  const pvSecHab = document.getElementById('pv-sec-habilidades');
  if (pvSkills && pvSecHab) {
    pvSkills.innerHTML = estado.habilidades.length === 0
      ? '<div class="pv-vazio">Adicione habilidades no Editar Perfil.</div>'
      : estado.habilidades.map(h =>
          `<span class="pv-skill-tag"><span class="pv-skill-dot"></span>${escapeHtml(h.nome)}</span>`
        ).join('');
  }

  const pvProj    = document.getElementById('pv-projetos');
  const pvSecProj = document.getElementById('pv-sec-projetos');
  if (pvProj && pvSecProj) {
    if (estado.projetos.length === 0) {
      pvProj.innerHTML = '<div class="pv-vazio">Adicione projetos na seção Projetos.</div>';
    } else {
      const ordenados = [...estado.projetos].sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0));
      pvProj.innerHTML = ordenados.map(p => {
        const techs = p.tech
          ? p.tech.split(/[,;]+/).map(t => t.trim()).filter(Boolean)
              .map(t => `<span class="pv-tech-tag">${escapeHtml(t)}</span>`).join('')
          : '';
        return `
          <div class="pv-projeto-card">
            ${p.destaque ? `<div class="pv-destaque-badge">⭐ Destaque</div>` : ''}
            <div class="pv-proj-nome">${escapeHtml(p.nome)}</div>
            <p class="pv-proj-desc">${escapeHtml(p.desc)}</p>
            ${techs ? `<div class="pv-proj-techs">${techs}</div>` : ''}
            ${p.github ? `<a href="${escapeHtml(p.github)}" target="_blank" rel="noopener" class="pv-proj-link">Ver código ↗</a>` : ''}
          </div>`;
      }).join('');
    }
  }

  const pvCerts    = document.getElementById('pv-certificados');
  const pvSecCerts = document.getElementById('pv-sec-certificados');
  if (pvCerts && pvSecCerts) {
    const icones = {
      'Desenvolvimento Web': '🌐', 'Mobile': '📱', 'Data Science': '📊',
      'Design': '🎨', 'DevOps': '⚙️', 'Idiomas': '🌍', 'Outro': '🏅'
    };
    if (estado.certificados.length === 0) {
      pvCerts.innerHTML = '<div class="pv-vazio">Adicione certificados na seção Certificados.</div>';
    } else {
      pvCerts.innerHTML = estado.certificados.map(c => `
        <div class="pv-cert-card">
          ${c.imagemUrl
            ? `<img src="${escapeHtml(otimizarImagem(c.imagemUrl, 80))}" class="pv-cert-img" />`
            : `<div class="pv-cert-icone">${icones[c.area] || '🏆'}</div>`
          }
          <div class="pv-cert-info">
            <div class="pv-cert-nome">${escapeHtml(c.nome)}</div>
            <div class="pv-cert-sub">
              ${escapeHtml(c.inst)}${c.data ? ' · ' + formatarData(c.data) : ''}
            </div>
          </div>
          ${c.area ? `<span class="pv-cert-badge">${escapeHtml(c.area)}</span>` : ''}
        </div>
      `).join('');
    }
  }

  const pvExp    = document.getElementById('pv-experiencias');
  const pvSecExp = document.getElementById('pv-sec-experiencias');
  if (pvExp && pvSecExp) {
    const tipoLabel = { profissional: 'Profissional', academica: 'Acadêmica', voluntario: 'Voluntariado', extracurricular: 'Extracurricular' };
    if (estado.experiencias.length === 0) {
      pvExp.innerHTML = '<div class="pv-vazio">Adicione experiências na seção Experiências.</div>';
    } else {
      pvExp.innerHTML = estado.experiencias.map(e => `
        <div class="pv-exp-item">
          <div class="pv-exp-dot"></div>
          ${e.inicio ? `<div class="pv-exp-periodo">${formatarData(e.inicio)} → ${e.fim ? formatarData(e.fim) : 'Atualmente'}</div>` : ''}
          <div class="pv-exp-cargo">${escapeHtml(e.cargo)}</div>
          <div class="pv-exp-empresa">${escapeHtml(e.empresa)}</div>
          ${e.desc ? `<p class="pv-exp-desc">${escapeHtml(e.desc)}</p>` : ''}
          <span class="pv-exp-tipo ${e.tipo || 'profissional'}">${tipoLabel[e.tipo] || e.tipo}</span>
        </div>
      `).join('');
    }
  }
}

// Link público - Gera um link para o perfil público e permite copiar para a área de transferência.

function atualizarLinkPortfolio() {
  const link = gerarLinkPortfolio();
  const btnSidebar = document.getElementById('btn-ver-perfil-link');
  const btnTop     = document.getElementById('btn-abrir-nova-aba');
  if (btnSidebar) btnSidebar.href = link;
  if (btnTop)     btnTop.href     = link;
}

function gerarLinkPortfolio() {
  return `${location.origin}${location.pathname.replace('index.html','').replace(/\/$/, '')}/perfil.html?uid=${uid}`;
}

window.copiarLinkPerfil = () => {
  const link = gerarLinkPortfolio();
  navigator.clipboard.writeText(link)
    .then(() => flash('Link copiado! ✓', 'sucesso'))
    .catch(() => flash('Não foi possível copiar.'));
};

// UI helpers - funções para mostrar/ocultar telas, renderizar o conteúdo e formatar dados.

function mostrarTela(nome) {
  document.getElementById('tela-auth').style.display      = nome === 'auth'      ? 'flex' : 'none';
  document.getElementById('tela-dashboard').style.display = nome === 'dashboard' ? 'flex' : 'none';
}

window.mostrarSecao = (nome, btnRef) => {
  document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa'));
  const secao = document.getElementById('secao-' + nome);
  if (secao) secao.classList.add('ativa');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btnRef) {
    btnRef.classList.add('active');
  } else {
    document.querySelectorAll('.nav-btn').forEach(b => {
      if (b.dataset.secao === nome) b.classList.add('active');
    });
  }
};

function atualizarCabecalho() {
  const nome     = estado.perfil.nome    || '';
  const area     = estado.perfil.area    || '';
  const fotoUrl  = estado.perfil.fotoUrl || '';
  const iniciais = nome.split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase() || '?';

  document.getElementById('sidebar-nome').textContent = nome;
  document.getElementById('sidebar-area').textContent = area;

  const sidebarAvatar = document.getElementById('sidebar-avatar-el');
  if (sidebarAvatar) {
    sidebarAvatar.innerHTML = fotoUrl
      ? `<img src="${escapeHtml(otimizarImagem(fotoUrl, 80))}" alt="" />`
      : iniciais;
  }
}

function renderizarTudo() {
  document.getElementById('perfil-nome').value     = estado.perfil.nome     || '';
  document.getElementById('perfil-area').value     = estado.perfil.area     || '';
  document.getElementById('perfil-bio').value      = estado.perfil.bio      || '';
  document.getElementById('perfil-linkedin').value = estado.perfil.linkedin || '';
  document.getElementById('perfil-github').value   = estado.perfil.github   || '';

  if (estado.perfil.fotoUrl) {
    document.getElementById('btn-remover-foto').style.display = 'inline-flex';
  }

  renderizarFotosPerfil();
  renderizarHabilidades();
  renderizarProjetos();
  renderizarCertificados();
  renderizarExperiencias();
  renderizarPreviewPortfolio();
}

// Utilitários - funções auxiliares para gerar IDs, escapar HTML, otimizar imagens, formatar datas e limpar campos.

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function otimizarImagem(url, largura = 200) {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/w_${largura},h_${largura},c_fill,q_auto,f_auto/`);
}

function formatarData(aaaamm) {
  if (!aaaamm) return '';
  const partes = aaaamm.split('-');
  const ano = partes[0];
  const mes = partes[1];
  if (!mes) return ano;
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const nomeMes = meses[parseInt(mes) - 1];
  if (!nomeMes) return ano;
  return `${nomeMes} ${ano}`;
}

function formatarTechs(tech) {
  return tech.split(/[,;]+/).map(t => t.trim()).filter(Boolean)
    .map(t => `<span class="badge">${escapeHtml(t)}</span>`).join(' ');
}

function limparCampos(ids) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}