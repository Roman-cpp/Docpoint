use crate::state::AppState;
use super::model::{CreateEnvironment, CreateVariable, EnvValue, Environment, UpdateEnvironment, UpdateVariable};
use super::repository;
use tauri::State;

#[tauri::command]
pub async fn delete_variable(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    repository::delete_variable(&state.db, &id).await
}

#[tauri::command]
pub async fn read_environments(
    state: State<'_, AppState>,
    doc_id: String,
) -> Result<Vec<Environment>, String> {
    repository::read_configs(&state.db, &doc_id).await
}

#[tauri::command]
pub async fn write_environments(
    state: State<'_, AppState>,
    doc_id: String,
    environments: Vec<CreateEnvironment>,
) -> Result<(), String> {
    repository::write_configs(&state.db, &doc_id, &environments).await
}

#[tauri::command]
pub async fn create_environment(
    state: State<'_, AppState>,
    doc_id: String,
    environment: CreateEnvironment,
) -> Result<Environment, String> {
    repository::create_environment(&state.db, &doc_id, &environment).await
}

#[tauri::command]
pub async fn update_environment(
    state: State<'_, AppState>,
    environment: UpdateEnvironment,
) -> Result<(), String> {
    repository::update_environment(&state.db, &environment).await
}

#[tauri::command]
pub async fn create_variable(
    state: State<'_, AppState>,
    environment_id: String,
    variable: CreateVariable,
) -> Result<EnvValue, String> {
    repository::create_variable(&state.db, &environment_id, &variable).await
}

#[tauri::command]
pub async fn update_variable(
    state: State<'_, AppState>,
    variable: UpdateVariable,
) -> Result<(), String> {
    repository::update_variable(&state.db, &variable).await
}

#[tauri::command]
pub async fn delete_environment(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    repository::delete_environment(&state.db, &id).await
}
