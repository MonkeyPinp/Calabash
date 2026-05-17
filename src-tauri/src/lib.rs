use serde::Deserialize;
use sqlx::{migrate::MigrateDatabase, sqlite::SqlitePoolOptions, Sqlite};
use std::{fs::create_dir_all, path::PathBuf};
use tauri::Manager;

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SqliteStatement {
    query: String,
    #[serde(default)]
    bind_values: Vec<serde_json::Value>,
}

#[tauri::command]
fn get_sqlite_db_path() -> String {
    std::env::var("CALABASH_SQLITE_DB_PATH")
        .ok()
        .filter(|db| validate_sqlite_db_path(db).is_ok())
        .unwrap_or_else(|| "sqlite:calabash.db".to_string())
}

#[tauri::command]
async fn execute_sqlite_transaction(
    app: tauri::AppHandle,
    db: String,
    statements: Vec<SqliteStatement>,
) -> Result<(), String> {
    let db_url = sqlite_url_for_app(&app, &db)?;
    execute_sqlite_statements(&db_url, statements).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            execute_sqlite_transaction,
            get_sqlite_db_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running Calabash");
}

fn sqlite_url_for_app(app: &tauri::AppHandle, db: &str) -> Result<String, String> {
    let relative_path = validate_sqlite_db_path(db)?;

    let mut db_path = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Could not resolve app config directory: {error}"))?;
    db_path.push(relative_path);

    if let Some(parent) = db_path.parent() {
        create_dir_all(parent)
            .map_err(|error| format!("Could not create database directory: {error}"))?;
    }

    Ok(format!(
        "sqlite:{}",
        db_path
            .to_str()
            .ok_or_else(|| "Database path is not valid UTF-8".to_string())?
    ))
}

fn validate_sqlite_db_path(db: &str) -> Result<PathBuf, String> {
    let relative = db
        .strip_prefix("sqlite:")
        .ok_or_else(|| "Only sqlite: database URLs are supported".to_string())?;
    let relative_path = PathBuf::from(relative);

    if relative_path.is_absolute()
        || relative_path.components().any(|component| {
            matches!(
                component,
                std::path::Component::ParentDir
                    | std::path::Component::RootDir
                    | std::path::Component::Prefix(_)
            )
        })
    {
        return Err("SQLite database path must stay inside the app config directory".to_string());
    }

    Ok(relative_path)
}

async fn execute_sqlite_statements(
    db_url: &str,
    statements: Vec<SqliteStatement>,
) -> Result<(), String> {
    if statements.is_empty() {
        return Ok(());
    }

    if !Sqlite::database_exists(db_url).await.unwrap_or(false) {
        Sqlite::create_database(db_url)
            .await
            .map_err(|error| format!("Could not create SQLite database: {error}"))?;
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(db_url)
        .await
        .map_err(|error| format!("Could not open SQLite database: {error}"))?;

    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| format!("Could not start SQLite transaction: {error}"))?;

    for statement in statements {
        let mut query = sqlx::query(&statement.query);
        for value in statement.bind_values {
            query = match value {
                serde_json::Value::Null => query.bind(None::<String>),
                serde_json::Value::Bool(value) => query.bind(value),
                serde_json::Value::Number(value) => {
                    if let Some(value) = value.as_i64() {
                        query.bind(value)
                    } else if let Some(value) = value.as_u64() {
                        query.bind(value as i64)
                    } else {
                        query.bind(value.as_f64().unwrap_or_default())
                    }
                }
                serde_json::Value::String(value) => query.bind(value),
                other => query.bind(other.to_string()),
            };
        }
        query
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("Could not execute SQLite statement: {error}"))?;
    }

    transaction
        .commit()
        .await
        .map_err(|error| format!("Could not commit SQLite transaction: {error}"))?;
    pool.close().await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{execute_sqlite_statements, SqliteStatement};
    use serde_json::json;
    use sqlx::{migrate::MigrateDatabase, Sqlite};

    fn temp_db_url(name: &str) -> String {
        let mut path = std::env::temp_dir();
        path.push(format!(
            "calabash-{name}-{}.db",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("system time before unix epoch")
                .as_nanos()
        ));
        format!("sqlite:{}", path.to_string_lossy())
    }

    #[test]
    fn sqlite_transaction_rolls_back_on_statement_failure() {
        tauri::async_runtime::block_on(async {
            let db_url = temp_db_url("rollback");
            execute_sqlite_statements(
                &db_url,
                vec![SqliteStatement {
                    query: "CREATE TABLE items (id TEXT PRIMARY KEY, value TEXT NOT NULL)"
                        .to_string(),
                    bind_values: vec![],
                }],
            )
            .await
            .expect("create test table");

            let result = execute_sqlite_statements(
                &db_url,
                vec![
                    SqliteStatement {
                        query: "INSERT INTO items (id, value) VALUES ($1, $2)".to_string(),
                        bind_values: vec![json!("item-1"), json!("kept only if committed")],
                    },
                    SqliteStatement {
                        query: "INSERT INTO missing_table (id) VALUES ($1)".to_string(),
                        bind_values: vec![json!("boom")],
                    },
                ],
            )
            .await;

            assert!(result.is_err());
            let pool = sqlx::SqlitePool::connect(&db_url)
                .await
                .expect("open test db");
            let (count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM items")
                .fetch_one(&pool)
                .await
                .expect("count rows");
            assert_eq!(count, 0);
            pool.close().await;
            Sqlite::drop_database(&db_url).await.ok();
        });
    }
}
