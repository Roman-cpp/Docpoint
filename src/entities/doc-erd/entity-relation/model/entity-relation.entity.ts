/**
 * Пара концов связи: сторона первичного ключа (`from`) и сторона внешнего
 * (`to`). В БД на этот кортеж стоит UNIQUE, поэтому он адресует связь не хуже
 * её id — этой формой и создают, и удаляют связь.
 */
export interface RelationEndpoints {
	fromEntity: string;
	fromField: string;
	toEntity: string;
	toField: string;
}

/**
 * Связь, как её возвращает команда `read_relations`.
 */
export interface EntityRelation extends RelationEndpoints {
	id: string;
}
