UPDATE public.categories SET ordem = CASE name
  WHEN 'Ferramentas Manuais' THEN 1
  WHEN 'Ferramenta Eletrica' THEN 2
  WHEN 'Fixacao' THEN 3
  WHEN 'Cimentos e Argamassas' THEN 4
  WHEN 'Tintas' THEN 5
  WHEN 'Material Electrico' THEN 6
  WHEN 'Canalizacao' THEN 7
  WHEN 'Coberturas e Terraços' THEN 8
  WHEN 'Higiene e Proteccao' THEN 9
  WHEN 'Quimicos' THEN 10
  WHEN 'Discos' THEN 11
  WHEN 'Perfuração, Demolição e Corte' THEN 12
  WHEN 'Drogaria' THEN 13
  WHEN 'Ferragens' THEN 14
  WHEN 'Solo e Drenagem' THEN 15
  WHEN 'Pladur, Perfis e Acessorios' THEN 16
  WHEN 'Chapas' THEN 17
  WHEN 'Barramentos, Tubos e Perfis' THEN 18
  WHEN 'Arames Redes e Vedacoes' THEN 19
  WHEN 'Elevacao e Traccao' THEN 20
  WHEN 'Rodas, Rodizios e Rolamentos' THEN 21
  WHEN 'Solda' THEN 22
  WHEN 'Gas' THEN 23
  WHEN 'Exaustão e Ventilação' THEN 24
  ELSE 99
END;