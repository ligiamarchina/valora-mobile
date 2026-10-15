async function buscarRegistrosPaginados(criarConsulta) {
  const tamanhoPagina = 1000;
  const registros = [];

  for (let inicio = 0; ; inicio += tamanhoPagina) {
    const { data, error } = await criarConsulta()
      .range(inicio, inicio + tamanhoPagina - 1);

    if (error) throw error;
    registros.push(...(data || []));
    if (!data || data.length < tamanhoPagina) return registros;
  }
}

module.exports = buscarRegistrosPaginados;