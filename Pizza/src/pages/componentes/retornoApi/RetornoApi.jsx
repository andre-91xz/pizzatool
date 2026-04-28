import './retornoApi.css'

function RetornoApi({ tipo, mensagem }) {
    if (!mensagem) return null

    const classeTipo = tipo === 'sucesso' ? 'sucesso' : 'erro'

    return (
        <div className={`retorno-api-overlay ${classeTipo}`}>
            <div className={`retorno-api ${classeTipo}`} role='status' aria-live='polite'>
                {mensagem}
            </div>
        </div>
    )
}

export default RetornoApi
