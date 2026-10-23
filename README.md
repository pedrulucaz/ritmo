# Ritmo 🏃‍♀️🏋️

**Ritmo** é um aplicativo web estático e instalável (PWA) para musculação e corrida. Cada usuário cria seu próprio plano inicial a partir de um questionário, sem treino pessoal predefinido.

## Recursos da versão inicial
- Questionário: objetivo, nível, treino em casa/academia, número de dias, duração e quantidade de corridas.
- Divisão automática de musculação de 2 a 6 dias e sessões de corrida adequadas ao nível.
- Registro de exercícios, carga, repetições e anotações.
- Histórico, metas semanais e gráfico de evolução.
- Múltiplos perfis **locais** no mesmo navegador; exportação/importação de backup JSON.
- Instalação PWA e modo offline após o primeiro carregamento.

## Atenção: contas e privacidade
**O MVP ainda não oferece login seguro com usuário/senha.** Os perfis são separados somente no armazenamento local do navegador: qualquer pessoa com acesso a esse mesmo navegador poderá abrir os perfis. Os dados não sincronizam com outros dispositivos. Não armazene informações sensíveis. Antes do lançamento com contas reais, precisamos de um provedor de autenticação e banco de dados com autorização por usuário aplicada no servidor (ex.: Supabase Auth + RLS). Nunca guardar senhas, tokens secretos ou chaves de serviço no repositório, no código público ou no localStorage.

Planos são sugestões educativas e não substituem avaliação individual por educador físico ou profissional de saúde. Em caso de dor, lesão ou condição clínica, procure orientação profissional.

## Rodar localmente
Sirva a pasta em um servidor HTTP local, por exemplo:
\`\`\`bash
python3 -m http.server 8080
\`\`\`
Abra http://localhost:8080. Para instalação da PWA é necessário HTTPS ou localhost.

## Publicação no GitHub Pages
Projeto sem build: HTML/CSS/JavaScript.
1. GitHub > **Settings > Pages > Build and deployment > Source = GitHub Actions**.
2. O workflow \`.github/workflows/deploy.yml\` publica automaticamente quando \`main\` recebe commits.
3. Depois de publicar, endereço previsto: https://pedrulucaz.github.io/ritmo/

No iPhone: Compartilhar > Adicionar à Tela de Início.

## Modalidades e corrida
- No questionário e em **Ajustes**, escolha **Só musculação**, **Só corrida** ou **Musculação e corrida**.
- Em corrida, selecione nível independente do nível de musculação, distância confortável e os dias específicos da semana (1 a 5, inclusive em dias com musculação).
- Cada sessão de corrida descreve distância-alvo, propósito (leve, alternância/intervalado, regenerativa, longão), aquecimento, sessão principal e volta à calma.
- As distâncias são **indicativas**, não evoluem automaticamente entre semanas e não substituem orientação de profissionais; reduza a sessão quando necessário. O histórico e as trocas de exercícios continuam associados ao perfil e são preservados ao mudar de modalidade.

## Meu perfil e acompanhamento corporal
- Toque no nome/foto no topo para abrir a página de perfil, adicionar avatar, peso, altura, meta e um diário local com fotos e evolução do peso.
- Fotos são otimizadas em JPEG e armazenadas no **IndexedDB do próprio navegador**, não no GitHub. Dados textuais continuam no localStorage, por perfil.
- O cálculo de calorias utiliza Mifflin-St Jeor multiplicado por estimativa de atividade (1,2 / 1,375 / 1,55 / 1,725). É apenas uma estimativa para adultos (18+); não equivale a prescrição dietética ou profissional.
- Exportações JSON da versão 2 incluem dados e imagens locais. Para migrar de celular ou navegador, exporte e importe em Ajustes; a importação substitui os dados anteriores. Backups de versões antigas não incluem fotos.
- Em dispositivos compartilhados, perfis e fotos podem ser vistos por terceiros; não há autenticação e a exclusão dos dados do navegador pode apagar definitivamente o histórico.
