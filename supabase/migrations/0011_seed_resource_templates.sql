-- Catálogo inicial da biblioteca de recursos (portado do seeder Laravel).
-- Idempotente via unique(title, instrument). Superadmin pode editar/expandir depois.
insert into public.resource_templates
  (title, description, category, instrument_category, instrument, difficulty, content_type, body)
values
  -- TECLAS
  ('Hanon nº 1: Extensão dos dedos', 'Exercício fundamental para independência e força dos dedos.', 'Técnica', 'Teclas', 'Piano', 'Iniciante', 'Texto', 'Praticar com metrônomo a 60bpm, subindo de 5 em 5. Focar na articulação igual de todos os dedos.'),
  ('Formação de Tríades Maiores e Menores', 'Teoria básica de construção de acordes.', 'Teoria', 'Teclas', 'Teclado', 'Iniciante', 'Texto', 'Maior: Tônica + 3ª Maior + 5ª Justa. Menor: Tônica + 3ª Menor + 5ª Justa.'),
  ('Bach: Minueto em Sol Maior', 'Peça clássica do caderno de Anna Magdalena Bach.', 'Repertório', 'Teclas', 'Piano', 'Intermediário', 'Texto', 'Atenção ao fraseado da mão direita e ao staccato da mão esquerda.'),
  -- CORDAS
  ('Exercício Cromático 1-2-3-4', 'Aquecimento para independência dos dedos da mão esquerda.', 'Aquecimento', 'Cordas', 'Violão', 'Iniciante', 'Texto', 'Tocar casas 1, 2, 3, 4 em todas as cordas, ida e volta. Manter o polegar centralizado atrás do braço.'),
  ('Pestanas em Fá e Si menor', 'Fortalecimento para acordes com barreira.', 'Técnica', 'Cordas', 'Violão', 'Iniciante', 'Texto', 'Certifique-se de que o dedo indicador está reto e próximo ao traste. Não force o pulso.'),
  ('Tempo Perdido - Legião Urbana', 'Cifra simplificada para iniciantes.', 'Repertório', 'Cordas', 'Violão', 'Iniciante', 'Cifra/Tablatura', E'Intro: C Am Bm Em\n\nTodos os dias quando acordo...'),
  -- SOPROS
  ('Notas Longas: Controle de Embocadura', 'Exercício de sustentação e estabilidade.', 'Aquecimento', 'Sopros', 'Saxofone', 'Iniciante', 'Texto', 'Sustentar cada nota da escala de Dó Maior por 8 tempos a 60bpm. Focar na coluna de ar constante.'),
  ('Escala Cromática: Duas Oitavas', 'Agilidade e conhecimento do instrumento.', 'Técnica', 'Sopros', 'Flauta Transversal', 'Intermediário', 'Texto', 'Praticar ligado e staccato. Atenção às passagens de registro.'),
  ('Blue Bossa: Tema e Escala de Blues', 'Introdução à improvisação em Jazz/Bossa.', 'Repertório', 'Sopros', 'Saxofone', 'Avançado', 'Texto', 'Usar escala de Dó menor pentatônica sobre a parte A.'),
  -- PERCUSSÃO
  ('Single Stroke Roll (Toque Simples)', 'Controle de rebote e igualdade entre as mãos.', 'Aquecimento', 'Percussão', 'Bateria', 'Iniciante', 'Texto', 'D E D E... Aumentar a velocidade gradualmente sem tensionar os ombros.'),
  ('Rudimento: Paradiddle Simples', 'Combinação de toques simples e duplos.', 'Técnica', 'Percussão', 'Caixa', 'Iniciante', 'Texto', 'D E D D E D E E. Acentuar a primeira nota de cada grupo de 4.'),
  ('Groove Rock 8 beats', 'Ritmo básico de rock com variação de bumbo.', 'Repertório', 'Percussão', 'Bateria', 'Iniciante', 'Texto', 'Chimbal em colcheias. Bumbo no 1 e 3 (e variações). Caixa no 2 e 4.'),
  -- VOZ
  ('Vocalizes de Vibração', 'Aquecimento com vibração de lábios e língua (Trill).', 'Aquecimento', 'Voz', 'Canto', 'Iniciante', 'Texto', 'Relaxar a mandíbula. Fazer glissandos ascendentes e descendentes.'),
  ('Apoio Diafragmático', 'Sustentação de notas e controle de saída de ar.', 'Técnica', 'Voz', 'Canto', 'Iniciante', 'Texto', 'Inspirar expandindo as costelas. Emitir "S" contínuo (tszzz) controlando o fluxo.')
on conflict (title, instrument) do nothing;
