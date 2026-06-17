/**
 * Runner de código Égua/Délégua para o TutorÉgua.
 * Uso: node egua_runner.js <arquivo.egua> [entrada1] [entrada2] ...
 *
 * Saída: stdout com o resultado da execução.
 * Erros: stderr com mensagem de erro.
 */
const path = require('path');
const { Lexador, AvaliadorSintatico, Interpretador } = require('@designliquido/delegua');

async function main() {
    const args = process.argv.slice(2);
    if (!args[0]) {
        process.stderr.write('Uso: node egua_runner.js <arquivo.egua> [entradas...]\n');
        process.exit(1);
    }

    const arquivoEgua = args[0];
    const entradas = args.slice(1);
    let entradaIdx = 0;

    const fs = require('fs');
    let codigo;
    try {
        codigo = fs.readFileSync(arquivoEgua, 'utf-8');
    } catch {
        process.stderr.write(`Arquivo não encontrado: ${arquivoEgua}\n`);
        process.exit(1);
    }

    let saida = '';
    const interp = new Interpretador(
        path.dirname(arquivoEgua),
        false,
        (s) => { saida += String(s); },
        (s) => { saida += String(s); }
    );
    interp.interfaceEntradaSaida = {
        question: (_prompt, cb) => cb(String(entradas[entradaIdx++] ?? ''))
    };

    const lex = new Lexador();
    const sin = new AvaliadorSintatico();

    const retornoLex = lex.mapear(codigo.split('\n'), -1);
    if (retornoLex.erros?.length) {
        process.stderr.write(retornoLex.erros.map(e => e.mensagem || e.message).join('\n') + '\n');
        process.exit(1);
    }

    const retornoSin = await sin.analisar(retornoLex, -1);
    if (retornoSin.erros?.length) {
        process.stderr.write(retornoSin.erros.map(e => e.mensagem || e.message).join('\n') + '\n');
        process.exit(1);
    }

    const resultado = await interp.interpretar(retornoSin.declaracoes, false);
    if (resultado.erros?.length) {
        const msg = resultado.erros.map(e => e.erroInterno?.mensagem || e.message || JSON.stringify(e)).join('\n');
        process.stderr.write(msg + '\n');
        process.exit(1);
    }

    process.stdout.write(saida.trim());
}

main().catch(e => {
    process.stderr.write(e.message + '\n');
    process.exit(1);
});
