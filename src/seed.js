// Glossário inicial. Os significados são genéricos de propósito:
// cada casa tem sua doutrina, então ajuste conforme o que for ensinado no curso.
// As variantes são erros que já apareceram na transcrição da primeira aula.
const t = (termo, significado, variantes = []) => ({
  id: termo, termo, significado, variantes, acertos: 0, erros: 0,
});

export const GLOSSARIO_INICIAL = [
  t("atabaque", "Tambor sagrado usado na gira para conduzir os pontos.", ["ababá", "ababate", "staaco", "mataaco"]),
  t("atabaqueiro", "Quem toca o atabaque na gira, dentro da curimba.", ["praaqueiro", "tabaqueiro"]),
  t("curimba", "Conjunto de quem toca e canta os pontos na gira.", ["coripa"]),
  t("gira", "A sessão de trabalho espiritual no terreiro.", ["aira"]),
  t("ponto cantado", "Cântico que chama, saúda ou despede uma linha ou entidade."),
  t("puxar o ponto", "Iniciar um ponto cantado. Na casa, quem define é a dirigente."),
  t("atravessar", "Sair do ritmo do toque, acelerando ou desencontrando dos outros."),
  t("terreiro", "A casa onde acontecem as giras."),
  t("dirigente", "Quem conduz a casa e a gira."),
  t("doutrina", "O conjunto de regras e fundamentos de uma casa.", ["douina"]),
  t("fundamento", "Base de conhecimento e prática que sustenta um ritual."),
  t("sete linhas", "Divisão das forças e entidades da umbanda em sete linhas."),
  t("Exu", "Guardião ligado à proteção e aos caminhos.", ["enxu"]),
  t("Ogum", "Orixá ligado à lei, à luta e à abertura de caminhos."),
  t("Oxóssi", "Orixá ligado ao conhecimento, às matas e à fartura."),
  t("Xangô", "Orixá ligado à justiça."),
  t("Iemanjá", "Orixá ligada ao mar e à geração."),
  t("Oxum", "Orixá ligada às águas doces e ao amor."),
  t("Oxalá", "Orixá ligado à fé e à criação."),
  t("caboclo", "Entidade associada aos povos originários e às matas."),
  t("preto-velho", "Entidade associada à sabedoria e à paciência."),
  t("baiano", "Entidade da linha dos baianos."),
  t("médium", "Pessoa que serve de canal para a comunicação espiritual."),
  t("incorporação", "Quando a entidade se manifesta através do médium."),
  t("descarrego", "Trabalho para limpar energias negativas."),
  t("consagração", "Ritual que torna um objeto ou instrumento sagrado."),
  t("obrigação", "Compromisso ritual do médium com suas entidades e a casa."),
];
