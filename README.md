# SafeLab RFID — Backend

Sistema de gestão e segurança de equipamentos em laboratórios académicos.

## Pré-requisitos

- Java 17+: `sudo apt install openjdk-17-jdk`
- Maven: `sudo apt install maven`
- PostgreSQL: `sudo apt install postgresql`

## Configurar a base de dados

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE safelab;
CREATE USER safelab_user WITH PASSWORD 'safelab123';
GRANT ALL PRIVILEGES ON DATABASE safelab TO safelab_user;
\q
```

Actualiza `src/main/resources/application.properties` com as tuas credenciais.

## Arrancar o projecto

```bash
cd safelab
mvn spring-boot:run
```

O servidor arranca em: http://localhost:8080

## Endpoints principais

| Método | URL | Descrição |
|--------|-----|-----------|
| POST | /api/leituras | Processar leitura RFID (chamado pelo leitor) |
| GET | /api/equipamentos | Listar equipamentos |
| POST | /api/equipamentos | Registar equipamento |
| GET | /api/funcionarios | Listar funcionários |
| POST | /api/funcionarios | Registar funcionário |
| GET | /api/eventos/alarmes | Listar alarmes |
| GET | /api/eventos/resumo | Resumo para o dashboard |

## Testar sem hardware RFID

Usar curl ou Postman para simular leituras:

```bash
# 1. Registar um funcionário
curl -X POST http://localhost:8080/api/funcionarios \
  -H "Content-Type: application/json" \
  -d '{"tagRfid":"TAG-FUNC-001","nome":"João Silva","email":"joao@isptec.co.ao","cargo":"Docente"}'

# 2. Registar um equipamento
curl -X POST http://localhost:8080/api/equipamentos \
  -H "Content-Type: application/json" \
  -d '{"tagRfid":"TAG-EQ-001","nome":"Laptop Dell","numeroSerie":"SN12345","laboratorio":"Lab Informática 1"}'

# 3. Simular funcionário a apresentar o cartão
curl -X POST http://localhost:8080/api/leituras \
  -H "Content-Type: application/json" \
  -d '{"tagRfid":"TAG-FUNC-001","portaId":"PORTA_LAB1"}'

# 4. Simular saída do equipamento (dentro dos 10 segundos → AUTORIZADO)
curl -X POST http://localhost:8080/api/leituras \
  -H "Content-Type: application/json" \
  -d '{"tagRfid":"TAG-EQ-001","portaId":"PORTA_LAB1"}'

# 5. Simular saída SEM funcionário → ALARME
curl -X POST http://localhost:8080/api/leituras \
  -H "Content-Type: application/json" \
  -d '{"tagRfid":"TAG-EQ-001","portaId":"PORTA_LAB1"}'
```

## Estrutura do projecto

```
src/main/java/ao/safelab/
├── SafeLabApplication.java
├── controller/
│   ├── LeituraController.java      ← endpoint principal RFID
│   ├── EquipamentoController.java
│   ├── FuncionarioController.java
│   └── EventoController.java
├── service/
│   ├── LeituraService.java         ← lógica de negócio central
│   └── AlertaService.java          ← SMS e email
├── entity/
│   ├── Equipamento.java
│   ├── Funcionario.java
│   └── Evento.java
├── repository/
│   ├── EquipamentoRepository.java
│   ├── FuncionarioRepository.java
│   └── EventoRepository.java
└── dto/
    ├── LeituraDTO.java
    └── EquipamentoDTO.java
```

## Frontend Angular

O frontend standalone está em [`frontend/`](./frontend), com Angular 18,
Signals, integração REST com `/api` e Web Serial para o protocolo
`RFID:<TAG_ID>:<PORTA_ID>`.

```bash
cd frontend
npm install
npm start
```

Por defeito, a API é `http://localhost:8080`. Para alterar a API em runtime,
copie `frontend/.env.example` para `.env` ou defina `API_URL` no
`docker compose`.

```bash
cd frontend
docker compose up --build
```
