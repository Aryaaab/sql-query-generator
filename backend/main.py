# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
import os
from dotenv import load_dotenv, set_key

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if not os.path.exists(dotenv_path):
    # Create empty .env if not present
    with open(dotenv_path, "w") as f:
        f.write("# SQL Query Generator API Configuration\n")
load_dotenv(dotenv_path)

from modules.query_generator import QueryGenerator
from modules.query_explainer import QueryExplainer
from modules.query_analyzer import QueryAnalyzer
from modules.query_validator import QueryValidator
from modules.db_manager import DatabaseManager
from modules.history_manager import HistoryManager

app = FastAPI(title="SQL Query Generator API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize modules
db_manager = DatabaseManager()
history_manager = HistoryManager()
query_generator = QueryGenerator()
query_explainer = QueryExplainer()
query_analyzer = QueryAnalyzer()
query_validator = QueryValidator()

# Pydantic models for request/response bodies
class SettingsRequest(BaseModel):
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None

class DbConnectRequest(BaseModel):
    type: str  # mysql, postgresql, sqlite, mock
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    database: Optional[str] = None  # DB name, file path, or mock schema key

class QueryRequest(BaseModel):
    natural_language: str
    provider: Optional[str] = None  # openai, gemini, rules or None (auto-detect)

class QueryOption(BaseModel):
    sql: str
    explanation: str
    confidence: str
    query_type: str
    validation: dict
    analysis: dict

class QueryResponse(BaseModel):
    queries: List[QueryOption]
    active_schema_name: str

class QueryExecuteRequest(BaseModel):
    sql: str
    prompt: Optional[str] = ""

class QueryExecuteResponse(BaseModel):
    success: bool
    columns: List[str]
    rows: List[dict]
    rows_affected: int
    execution_time_ms: float
    message: Optional[str] = None

@app.get("/")
async def root():
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    return {
        "message": "SQL Query Generator API is running",
        "active_schema": db_manager.active_schema_name,
        "openai_configured": bool(openai_key),
        "gemini_configured": bool(gemini_key)
    }

@app.post("/api/settings")
async def save_settings(request: SettingsRequest):
    """Save API keys into local .env file and update runtime environment"""
    try:
        if request.openai_api_key is not None:
            set_key(dotenv_path, "OPENAI_API_KEY", request.openai_api_key.strip())
            os.environ["OPENAI_API_KEY"] = request.openai_api_key.strip()
            
        if request.gemini_api_key is not None:
            set_key(dotenv_path, "GEMINI_API_KEY", request.gemini_api_key.strip())
            os.environ["GEMINI_API_KEY"] = request.gemini_api_key.strip()
            
        # Reload env variables
        load_dotenv(dotenv_path, override=True)
        
        return {
            "success": True, 
            "message": "Settings saved successfully",
            "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
            "gemini_configured": bool(os.getenv("GEMINI_API_KEY"))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")

@app.get("/api/db/schemas")
async def get_mock_schemas():
    """Retrieve preloaded mock schema options"""
    schemas = []
    for key, val in db_manager.mock_schemas.items():
        schemas.append({
            "key": key,
            "name": val["name"],
            "tables": list(val["tables"].keys())
        })
    return schemas

@app.post("/api/db/test")
async def test_db_connection(request: DbConnectRequest):
    """Test connection credentials without making it active"""
    config = request.model_dump()
    result = db_manager.test_connection(config)
    return result

@app.post("/api/db/connect")
async def connect_db(request: DbConnectRequest):
    """Connect to database (real or mock) and crawl schema"""
    config = request.model_dump()
    if request.type == "mock":
        # Handle mock schema connection
        result = db_manager.connect_mock(request.database)
    else:
        # Handle real MySQL / PostgreSQL / SQLite connection
        result = db_manager.connect_real(config)
        
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
        
    return result

@app.post("/api/generate-query", response_model=QueryResponse)
async def generate_query(request: QueryRequest):
    """Generate, validate, explain, and analyze queries based on active database schema"""
    try:
        # 1. Fetch current schema context text
        schema_context = db_manager.get_schema_context_text()
        
        # 2. Generate queries using generator (AI or Rules)
        raw_options = query_generator.generate(
            natural_language=request.natural_language,
            schema_context=schema_context,
            provider=request.provider
        )
        
        options = []
        for opt in raw_options:
            sql = opt["sql"]
            
            # 3. Validate SQL against local syntax and active DB compiler
            validation = query_validator.validate(sql, db_manager.active_engine)
            
            # 4. Explain query (AI or rules)
            explanation = query_explainer.explain(sql, request.provider)
            
            # 5. Analyze impact details
            analysis = query_analyzer.analyze(sql, schema_context)
            
            options.append(QueryOption(
                sql=sql,
                explanation=explanation,
                confidence=opt.get("confidence", "medium"),
                query_type=opt.get("query_type", "SELECT"),
                validation=validation,
                analysis=analysis
            ))
            
        return QueryResponse(
            queries=options,
            active_schema_name=db_manager.active_schema_name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.post("/api/db/execute", response_model=QueryExecuteResponse)
async def execute_query(request: QueryExecuteRequest):
    """Execute a query, log it into history, and return results"""
    try:
        # Run execution
        result = db_manager.execute_query(request.sql)
        
        # Determine status
        status = "SUCCESS" if result["success"] else "ERROR"
        err_msg = result.get("message") if not result["success"] else None
        
        # Log to execution history database
        history_manager.log_query(
            prompt=request.prompt,
            sql_query=request.sql,
            schema_name=db_manager.active_schema_name,
            status=status,
            rows_affected=result.get("rows_affected", 0),
            execution_time_ms=result.get("execution_time_ms", 0.0),
            error_message=err_msg
        )
        
        if not result["success"]:
            return QueryExecuteResponse(
                success=False,
                columns=[],
                rows=[],
                rows_affected=0,
                execution_time_ms=result.get("execution_time_ms", 0.0),
                message=result["message"]
            )
            
        return QueryExecuteResponse(
            success=True,
            columns=result.get("columns", []),
            rows=result.get("rows", []),
            rows_affected=result.get("rows_affected", 0),
            execution_time_ms=result.get("execution_time_ms", 0.0)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution error: {str(e)}")

@app.get("/api/history")
async def get_history(limit: Optional[int] = 50):
    """Retrieve execution history logs"""
    return history_manager.get_logs(limit)

@app.post("/api/history/clear")
async def clear_history():
    """Clear query execution history logs"""
    history_manager.clear_logs()
    return {"success": True, "message": "History cleared"}

@app.post("/api/validate-query")
async def validate_query(sql: str):
    """Validate raw SQL query"""
    try:
        return query_validator.validate(sql, db_manager.active_engine)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/explain-query")
async def explain_query(sql: str):
    """Explain raw SQL query"""
    try:
        explanation = query_explainer.explain(sql)
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-query")
async def analyze_query(sql: str):
    """Analyze raw SQL query impact"""
    try:
        schema_context = db_manager.get_schema_context_text()
        return query_analyzer.analyze(sql, schema_context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
