// Estado da aplicacao
let estado = {
  perfil:       {},
  habilidades:  [],
  projetos:     [],
  certificados: [],
  experiencias: []
};

// Ao carregar a pagina
document.addEventListener('DOMContentLoaded', () => {
  carregarEstado();
  if (estado.perfil.nome) {
    mostrarTela('dashboard');
    atualizarCabecalho();
    renderizarTudo();
  }
});

// localStorage - armazenamento local
function salvarEstado() {
  localStorage.setItem('myway', JSON.stringify(estado));
}

function carregarEstado() {
  const salvo = localStorage.getItem('myway');
  if (salvo) estado = JSON.parse(salvo);
}

// Navegacao de telas
function mostrarTela(nome) {
  document.getElementById('tela-entrada').style.display   = nome === 'entrada'   ? 'block' : 'none';
  document.getElementById('tela-dashboard').style.display = nome === 'dashboard' ? 'block' : 'none';
}

function mostrarSecao(nome) {
  const secoes = ['perfil', 'portfolio', 'certificados', 'experiencias', 'vagas', 'dashboard'];
  secoes.forEach(s => {
    document.getElementById('secao-' + s).style.display = s === nome ? 'block' : 'none';
  });
  if (nome === 'dashboard') atualizarDashboard();
}

// Entrar / Sair
function entrar() {
  const nome = document.getElementById('input-nome').value.trim();
  const area = document.getElementById('input-area').value.trim();
  if (!nome) { alert('Digite seu nome!'); return; }
  estado.perfil.nome = nome;
  estado.perfil.area = area;
  salvarEstado();
  mostrarTela('dashboard');
  atualizarCabecalho();
  renderizarTudo();
}

function sair() {
  mostrarTela('entrada');
}

function atualizarCabecalho() {
  document.getElementById('nome-usuario').textContent = 'Olá, ' + (estado.perfil.nome || '');
  document.getElementById('area-usuario').textContent = estado.perfil.area || '';
}

// Perfil
function salvarPerfil() {
  estado.perfil.bio      = document.getElementById('perfil-bio').value;
  estado.perfil.linkedin = document.getElementById('perfil-linkedin').value;
  estado.perfil.github   = document.getElementById('perfil-github').value;
  salvarEstado();
}

// Habilidades
function adicionarHabilidade() {
  const input = document.getElementById('input-habilidade');
  const nome  = input.value.trim();
  if (!nome) return;
  estado.habilidades.push({ id: gerarId(), nome });
  salvarEstado();
  renderizarHabilidades();
  input.value = '';
}

function removerHabilidade(id) {
  estado.habilidades = estado.habilidades.filter(h => h.id !== id);
  salvarEstado();
  renderizarHabilidades();
}

function renderizarHabilidades() {
  const lista = document.getElementById('lista-habilidades');
  if (estado.habilidades.length === 0) { lista.innerHTML = '<p>Nenhuma habilidade adicionada.</p>'; return; }
  lista.innerHTML = estado.habilidades.map(h => `
    <span>${h.nome} <button onclick="removerHabilidade('${h.id}')">×</button></span>
  `).join(' ');
}

// Projetos
function adicionarProjeto() {
  const nome = document.getElementById('proj-nome').value.trim();
  const desc = document.getElementById('proj-desc').value.trim();
  if (!nome || !desc) { alert('Preencha nome e descrição!'); return; }
  estado.projetos.unshift({
    id: gerarId(), nome, desc,
    tech:   document.getElementById('proj-tech').value,
    github: document.getElementById('proj-github').value
  });
  salvarEstado();
  renderizarProjetos();
  document.getElementById('proj-nome').value   = '';
  document.getElementById('proj-desc').value   = '';
  document.getElementById('proj-tech').value   = '';
  document.getElementById('proj-github').value = '';
}

function removerProjeto(id) {
  if (!confirm('Excluir este projeto?')) return;
  estado.projetos = estado.projetos.filter(p => p.id !== id);
  salvarEstado();
  renderizarProjetos();
}

function renderizarProjetos() {
  const lista = document.getElementById('lista-projetos');
  if (estado.projetos.length === 0) { lista.innerHTML = '<p>Nenhum projeto adicionado ainda.</p>'; return; }
  lista.innerHTML = estado.projetos.map(p => `
    <div>
      <strong>${p.nome}</strong>
      <p>${p.desc}</p>
      ${p.tech   ? `<p>Tecnologias: ${p.tech}</p>` : ''}
      ${p.github ? `<p><a href="${p.github}" target="_blank">GitHub ↗</a></p>` : ''}
      <button onclick="removerProjeto('${p.id}')">Excluir</button>
    </div><hr>
  `).join('');
}

// Certificados
function adicionarCertificado() {
  const nome = document.getElementById('cert-nome').value.trim();
  const inst = document.getElementById('cert-inst').value.trim();
  if (!nome || !inst) { alert('Preencha nome e instituição!'); return; }
  estado.certificados.unshift({
    id: gerarId(), nome, inst,
    data: document.getElementById('cert-data').value
  });
  salvarEstado();
  renderizarCertificados();
  document.getElementById('cert-nome').value = '';
  document.getElementById('cert-inst').value = '';
  document.getElementById('cert-data').value = '';
}

function removerCertificado(id) {
  if (!confirm('Excluir este certificado?')) return;
  estado.certificados = estado.certificados.filter(c => c.id !== id);
  salvarEstado();
  renderizarCertificados();
}

function renderizarCertificados() {
  const lista = document.getElementById('lista-certificados');
  if (estado.certificados.length === 0) { lista.innerHTML = '<p>Nenhum certificado adicionado ainda.</p>'; return; }
  lista.innerHTML = estado.certificados.map(c => `
    <div>
      <strong>${c.nome}</strong>
      <p>${c.inst} ${c.data ? '— ' + c.data : ''}</p>
      <button onclick="removerCertificado('${c.id}')">Excluir</button>
    </div><hr>
  `).join('');
}

// Experiencias
function adicionarExperiencia() {
  const cargo   = document.getElementById('exp-cargo').value.trim();
  const empresa = document.getElementById('exp-empresa').value.trim();
  if (!cargo || !empresa) { alert('Preencha cargo e empresa!'); return; }
  estado.experiencias.unshift({
    id: gerarId(), cargo, empresa,
    inicio: document.getElementById('exp-inicio').value,
    fim:    document.getElementById('exp-fim').value,
    desc:   document.getElementById('exp-desc').value
  });
  salvarEstado();
  renderizarExperiencias();
  document.getElementById('exp-cargo').value   = '';
  document.getElementById('exp-empresa').value = '';
  document.getElementById('exp-inicio').value  = '';
  document.getElementById('exp-fim').value     = '';
  document.getElementById('exp-desc').value    = '';
}

function removerExperiencia(id) {
  if (!confirm('Excluir esta experiência?')) return;
  estado.experiencias = estado.experiencias.filter(e => e.id !== id);
  salvarEstado();
  renderizarExperiencias();
}

function renderizarExperiencias() {
  const lista = document.getElementById('lista-experiencias');
  if (estado.experiencias.length === 0) { lista.innerHTML = '<p>Nenhuma experiência adicionada ainda.</p>'; return; }
  lista.innerHTML = estado.experiencias.map(e => `
    <div>
      <strong>${e.cargo}</strong> — ${e.empresa}
      ${e.inicio ? `<p>${e.inicio} → ${e.fim || 'Atualmente'}</p>` : ''}
      ${e.desc   ? `<p>${e.desc}</p>` : ''}
      <button onclick="removerExperiencia('${e.id}')">Excluir</button>
    </div><hr>
  `).join('');
}

// Vagas — Fetch na Remotive API (https://remotive.com/api/remote-jobs) - busca de vagas
async function buscarVagas() {
  const termo     = document.getElementById('vagas-busca').value.trim();
  const resultado = document.getElementById('vagas-resultado');

  if (!termo) { alert('Digite algo para buscar!'); return; }

  resultado.innerHTML = '<p>Buscando vagas...</p>';

  try {
    const url      = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(termo)}&limit=10`;
    const resposta = await fetch(url);
    const dados    = await resposta.json();
    const vagas    = dados.jobs;

    if (!vagas || vagas.length === 0) {
      resultado.innerHTML = '<p>Nenhuma vaga encontrada. Tente outro termo.</p>';
      return;
    }

    resultado.innerHTML = vagas.map(v => `
      <div>
        <strong>${v.title}</strong>
        <p>${v.company_name} — ${v.candidate_required_location || 'Remoto'}</p>
        <p>${v.job_type}</p>
        <a href="${v.url}" target="_blank">Ver vaga ↗</a>
      </div><hr>
    `).join('');

  } catch (erro) {
    console.error(erro);
    resultado.innerHTML = '<p>Erro ao buscar vagas. Tente novamente.</p>';
  }
}

// Dash
function atualizarDashboard() {
  document.getElementById('total-projetos').textContent     = estado.projetos.length;
  document.getElementById('total-certificados').textContent = estado.certificados.length;
  document.getElementById('total-experiencias').textContent = estado.experiencias.length;
  document.getElementById('total-habilidades').textContent  = estado.habilidades.length;
}

// Render geral
function renderizarTudo() {
  document.getElementById('perfil-bio').value      = estado.perfil.bio      || '';
  document.getElementById('perfil-linkedin').value = estado.perfil.linkedin || '';
  document.getElementById('perfil-github').value   = estado.perfil.github   || '';
  renderizarHabilidades();
  renderizarProjetos();
  renderizarCertificados();
  renderizarExperiencias();
}

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}