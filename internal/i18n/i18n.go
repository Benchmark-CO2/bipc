package i18n

import (
	"fmt"
	"strings"
)

// Language represents a supported language
type Language string

const (
	English    Language = "en"
	Portuguese Language = "pt"
	Spanish    Language = "es"
)

// Localizer handles message translations
type Localizer struct {
	defaultLang Language
	messages    map[Language]map[string]string
}

// New creates a new Localizer instance
func New(defaultLang Language) *Localizer {
	l := &Localizer{
		defaultLang: defaultLang,
		messages:    make(map[Language]map[string]string),
	}

	l.loadMessages()
	return l
}

// loadMessages loads all translation messages
func (l *Localizer) loadMessages() {
	// English messages
	l.messages[English] = map[string]string{
		"server_error":            "the server encountered a problem and could not process your request",
		"not_found":               "the requested resource could not be found",
		"method_not_allowed":      "the %s method is not supported for this resource",
		"edit_conflict":           "unable to update the record due to an edit conflict, please try again",
		"rate_limit_exceeded":     "rate limit exceeded",
		"invalid_credentials":     "invalid authentication credentials",
		"invalid_auth_token":      "invalid, missing or expired authentication token",
		"authentication_required": "you must be authenticated to access this resource",
		"inactive_account":        "your user account must be activated to access this resource",
		"not_permitted":           "your user account doesn't have the necessary permissions to access this resource",
		"cannot_delete_admin":     "cannot delete user account: user is an administrator in one or more projects. please delete or transfer ownership of these projects first",
		// User messages
		"duplicate_email":              "a user with this email address already exists",
		"invalid_activation_token":     "invalid or expired activation token",
		"missing_password_reset_token": "missing or expired password reset token",
		"password_reset_success":       "your password was successfully reset",
		"user_deleted_success":         "user successfully deleted",
		// Invitation messages
		"invitation_not_found":         "no invitation found with the provided ID",
		"no_pending_invitation":        "no pending invitation found",
		"invitation_replied_success":   "invitation successfully replied",
		"user_already_project_member":  "this user is already a member of the project",
		"duplicate_pending_invitation": "a pending invitation already exists for this email in this project",
		"invitation_sent_success":      "invitation sent successfully",
		"invitation_deleted_success":   "invitation deleted successfully",
		// Project messages
		"invalid_project_id":                  "the provided projectID does not exist",
		"invalid_user_id":                     "the provided userID does not exist",
		"duplicate_user_project":              "user is already associated with the project",
		"duplicate_role_name":                 "you already have a role with this name",
		"invalid_permission_id":               "the provided permissionID does not exist",
		"invalid_role_id":                     "the provided roleID does not exist",
		"duplicate_role_permission":           "role already has permission associated",
		"duplicate_user_role":                 "user already has role associated",
		"project_deleted_success":             "project successfully deleted",
		"cannot_remove_full_permissions_user": "cannot remove a user with full permissions from the project",
		"user_removed_from_project":           "user successfully removed from project",
		// Token messages
		"no_matching_email":          "no matching email address found",
		"user_account_not_activated": "user account must be activated",
		"password_reset_email_sent":  "an email will be sent to you containing password reset instructions",
		"user_already_activated":     "user has already been activated",
		"activation_email_sent":      "an email will be sent to you containing activation instructions",
		// Role messages
		"invalid_project_id_param":      "projectID: does not exist or is invalid",
		"role_name_already_exists":      "already exists for this project",
		"duplicate_permission_ids":      "contain duplicate IDs",
		"invalid_permission_ids":        "contain invalid IDs",
		"invalid_user_ids":              "contain invalid IDs",
		"duplicate_user_ids":            "contain duplicate IDs",
		"role_not_in_project":           "role does not belong to the specified project",
		"role_cannot_be_modified":       "cannot be modified",
		"role_cannot_be_deleted":        "cannot be deleted",
		"role_deleted_success":          "role successfully deleted",
		"ownership_transferred_success": "ownership successfully transferred",
		// Unit messages
		"invalid_unit_type":       "invalid unit type",
		"duplicate_floor_indexes": "floor indexes must be unique",
		"floor_index_gap":         "floor indexes must be continuous without gaps",
		"unit_deleted_success":    "unit successfully deleted",
		// Option messages
		"option_deleted_success": "tower option successfully deleted",
		// Module messages
		"module_deleted_success": "module successfully deleted",
		// JSON parsing messages
		"json_badly_formed_at":      "body contains badly-formed JSON (at character %d)",
		"json_badly_formed":         "body contains badly-formed JSON",
		"json_incorrect_type_field": "body contains incorrect JSON type for field %q",
		"json_incorrect_type_at":    "body contains incorrect JSON type (at character %d)",
		"json_body_empty":           "body must not be empty",
		"json_unknown_field":        "body contains unknown key %s",
		"json_body_too_large":       "body must not be larger than %d bytes",
		"json_multiple_values":      "body must only contain a single JSON value",
		"json_must_be_integer":      "must be an integer value",
		// Validation messages
		"validation_must_be_provided":         "must be provided",
		"validation_greater_than_zero":        "must be greater than zero",
		"validation_max_10_million":           "must be a maximum of 10 million",
		"validation_max_50":                   "must be a maximum of 50",
		"validation_valid_sort_value":         "must be a valid sort value (allowed: %s)",
		"validation_valid_email":              "must be a valid email address",
		"validation_min_8_bytes":              "must be at least 8 bytes long",
		"validation_max_72_bytes":             "must not be more than 72 bytes long",
		"validation_max_500_bytes":            "must not be more than 500 bytes long",
		"validation_max_100_bytes":            "must not be more than 100 bytes long",
		"validation_max_20_bytes":             "must not be more than 20 bytes long",
		"validation_valid_type":               "must be a valid type (allowed: %s)",
		"validation_not_empty_if_provided":    "must not be empty if provided",
		"validation_exactly_14_digits":        "must be exactly 14 digits",
		"validation_only_digits":              "must contain only digits",
		"validation_valid_cep":                "must be a valid CEP",
		"validation_valid_state_code_2":       "must be a valid state code (2 characters)",
		"validation_valid_state_code_allowed": "must be a valid state code (allowed: %s)",
		"validation_empty_not_allowed":        "empty %s is not allowed",
		"validation_valid_phase":              "must be a valid phase (allowed: %s)",
		"validation_no_duplicate_ids":         "must not contain duplicate IDs",
		"validation_no_protected_ids":         "cannot contain protected permissionsIDs",
		"validation_token_26_bytes":           "must be 26 bytes long",
		"validation_valid_status":             "must be a valid status (allowed: %s)",
	}

	// Portuguese messages
	l.messages[Portuguese] = map[string]string{
		"server_error":            "o servidor encontrou um problema e não pôde processar sua solicitação",
		"not_found":               "o recurso solicitado não foi encontrado",
		"method_not_allowed":      "o método %s não é suportado para este recurso",
		"edit_conflict":           "não foi possível atualizar o registro devido a um conflito de edição, por favor tente novamente",
		"rate_limit_exceeded":     "limite de requisições excedido",
		"invalid_credentials":     "credenciais de autenticação inválidas",
		"invalid_auth_token":      "token de autenticação inválido, ausente ou expirado",
		"authentication_required": "você deve estar autenticado para acessar este recurso",
		"inactive_account":        "sua conta de usuário deve ser ativada para acessar este recurso",
		"not_permitted":           "sua conta de usuário não tem as permissões necessárias para acessar este recurso",
		"cannot_delete_admin":     "não é possível excluir a conta de usuário: o usuário é administrador em um ou mais projetos. por favor, exclua ou transfira a propriedade desses projetos primeiro",
		// User messages
		"duplicate_email":              "já existe um usuário com este endereço de e-mail",
		"invalid_activation_token":     "token de ativação inválido ou expirado",
		"missing_password_reset_token": "token de redefinição de senha ausente ou expirado",
		"password_reset_success":       "sua senha foi redefinida com sucesso",
		"user_deleted_success":         "usuário excluído com sucesso",
		// Invitation messages
		"invitation_not_found":         "nenhum convite encontrado com o ID fornecido",
		"no_pending_invitation":        "nenhum convite pendente encontrado",
		"invitation_replied_success":   "convite respondido com sucesso",
		"user_already_project_member":  "este usuário já é membro do projeto",
		"duplicate_pending_invitation": "já existe um convite pendente para este e-mail neste projeto",
		"invitation_sent_success":      "convite enviado com sucesso",
		"invitation_deleted_success":   "convite excluído com sucesso",
		// Project messages
		"invalid_project_id":                  "o projectID fornecido não existe",
		"invalid_user_id":                     "o userID fornecido não existe",
		"duplicate_user_project":              "o usuário já está associado ao projeto",
		"duplicate_role_name":                 "você já possui uma função com este nome",
		"invalid_permission_id":               "o permissionID fornecido não existe",
		"invalid_role_id":                     "o roleID fornecido não existe",
		"duplicate_role_permission":           "a função já possui permissão associada",
		"duplicate_user_role":                 "o usuário já possui função associada",
		"project_deleted_success":             "projeto excluído com sucesso",
		"cannot_remove_full_permissions_user": "não é possível remover um usuário com permissões completas do projeto",
		"user_removed_from_project":           "usuário removido do projeto com sucesso",
		// Token messages
		"no_matching_email":          "nenhum endereço de e-mail correspondente encontrado",
		"user_account_not_activated": "a conta do usuário deve ser ativada",
		"password_reset_email_sent":  "um e-mail será enviado com instruções para redefinir sua senha",
		"user_already_activated":     "o usuário já foi ativado",
		"activation_email_sent":      "um e-mail será enviado com instruções de ativação",
		// Role messages
		"invalid_project_id_param":      "projectID: não existe ou é inválido",
		"role_name_already_exists":      "já existe para este projeto",
		"duplicate_permission_ids":      "contêm IDs duplicados",
		"invalid_permission_ids":        "contêm IDs inválidos",
		"invalid_user_ids":              "contêm IDs inválidos",
		"duplicate_user_ids":            "contêm IDs duplicados",
		"role_not_in_project":           "a função não pertence ao projeto especificado",
		"role_cannot_be_modified":       "não pode ser modificada",
		"role_cannot_be_deleted":        "não pode ser excluída",
		"role_deleted_success":          "função excluída com sucesso",
		"ownership_transferred_success": "propriedade transferida com sucesso",
		// Unit messages
		"invalid_unit_type":       "tipo de unidade inválido",
		"duplicate_floor_indexes": "os índices dos andares devem ser únicos",
		"floor_index_gap":         "os índices dos andares devem ser contínuos sem lacunas",
		"unit_deleted_success":    "unidade excluída com sucesso",
		// Option messages
		"option_deleted_success": "opção da torre excluída com sucesso",
		// Module messages
		"module_deleted_success": "módulo excluído com sucesso",
		// JSON parsing messages
		"json_badly_formed_at":      "o corpo contém JSON malformado (no caractere %d)",
		"json_badly_formed":         "o corpo contém JSON malformado",
		"json_incorrect_type_field": "o corpo contém tipo JSON incorreto para o campo %q",
		"json_incorrect_type_at":    "o corpo contém tipo JSON incorreto (no caractere %d)",
		"json_body_empty":           "o corpo não deve estar vazio",
		"json_unknown_field":        "o corpo contém chave desconhecida %s",
		"json_body_too_large":       "o corpo não deve ser maior que %d bytes",
		"json_multiple_values":      "o corpo deve conter apenas um único valor JSON",
		"json_must_be_integer":      "deve ser um valor inteiro",
		// Validation messages
		"validation_must_be_provided":         "deve ser fornecido",
		"validation_greater_than_zero":        "deve ser maior que zero",
		"validation_max_10_million":           "deve ser no máximo 10 milhões",
		"validation_max_50":                   "deve ser no máximo 50",
		"validation_valid_sort_value":         "deve ser um valor de ordenação válido (permitido: %s)",
		"validation_valid_email":              "deve ser um endereço de email válido",
		"validation_min_8_bytes":              "deve ter pelo menos 8 bytes",
		"validation_max_72_bytes":             "não deve ter mais de 72 bytes",
		"validation_max_500_bytes":            "não deve ter mais de 500 bytes",
		"validation_max_100_bytes":            "não deve ter mais de 100 bytes",
		"validation_max_20_bytes":             "não deve ter mais de 20 bytes",
		"validation_valid_type":               "deve ser um tipo válido (permitido: %s)",
		"validation_not_empty_if_provided":    "não deve estar vazio se fornecido",
		"validation_exactly_14_digits":        "deve ter exatamente 14 dígitos",
		"validation_only_digits":              "deve conter apenas dígitos",
		"validation_valid_cep":                "deve ser um CEP válido",
		"validation_valid_state_code_2":       "deve ser um código de estado válido (2 caracteres)",
		"validation_valid_state_code_allowed": "deve ser um código de estado válido (permitido: %s)",
		"validation_empty_not_allowed":        "%s vazio não é permitido",
		"validation_valid_phase":              "deve ser uma fase válida (permitido: %s)",
		"validation_no_duplicate_ids":         "não deve conter IDs duplicados",
		"validation_no_protected_ids":         "não pode conter IDs de permissões protegidas",
		"validation_token_26_bytes":           "deve ter 26 bytes",
		"validation_valid_status":             "deve ser um status válido (permitido: %s)",
	}

	// Spanish messages
	l.messages[Spanish] = map[string]string{
		"server_error":            "el servidor encontró un problema y no pudo procesar su solicitud",
		"not_found":               "el recurso solicitado no fue encontrado",
		"method_not_allowed":      "el método %s no es compatible con este recurso",
		"edit_conflict":           "no se pudo actualizar el registro debido a un conflicto de edición, por favor intente nuevamente",
		"rate_limit_exceeded":     "límite de solicitudes excedido",
		"invalid_credentials":     "credenciales de autenticación inválidas",
		"invalid_auth_token":      "token de autentificación inválido, ausente o expirado",
		"authentication_required": "debe estar autenticado para acceder a este recurso",
		"inactive_account":        "su cuenta de usuario debe ser activada para acceder a este recurso",
		"not_permitted":           "su cuenta de usuario no tiene los permisos necesarios para acceder a este recurso",
		"cannot_delete_admin":     "no se puede eliminar la cuenta de usuario: el usuario es administrador en uno o más proyectos. por favor, elimine o transfiera la propiedad de estos proyectos primero",
		// User messages
		"duplicate_email":              "ya existe un usuario con esta dirección de correo electrónico",
		"invalid_activation_token":     "token de activación inválido o expirado",
		"missing_password_reset_token": "token de restablecimiento de contraseña ausente o expirado",
		"password_reset_success":       "su contraseña fue restablecida con éxito",
		"user_deleted_success":         "usuario eliminado con éxito",
		// Invitation messages
		"invitation_not_found":         "no se encontró ninguna invitación con el ID proporcionado",
		"no_pending_invitation":        "no se encontró ninguna invitación pendiente",
		"invitation_replied_success":   "invitación respondida con éxito",
		"user_already_project_member":  "este usuario ya es miembro del proyecto",
		"duplicate_pending_invitation": "ya existe una invitación pendiente para este correo electrónico en este proyecto",
		"invitation_sent_success":      "invitación enviada con éxito",
		"invitation_deleted_success":   "invitación eliminada con éxito",
		// Project messages
		"invalid_project_id":                  "el projectID proporcionado no existe",
		"invalid_user_id":                     "el userID proporcionado no existe",
		"duplicate_user_project":              "el usuario ya está asociado al proyecto",
		"duplicate_role_name":                 "ya tiene un rol con este nombre",
		"invalid_permission_id":               "el permissionID proporcionado no existe",
		"invalid_role_id":                     "el roleID proporcionado no existe",
		"duplicate_role_permission":           "el rol ya tiene permiso asociado",
		"duplicate_user_role":                 "el usuario ya tiene rol asociado",
		"project_deleted_success":             "proyecto eliminado con éxito",
		"cannot_remove_full_permissions_user": "no se puede eliminar un usuario con permisos completos del proyecto",
		"user_removed_from_project":           "usuario eliminado del proyecto con éxito",
		// Token messages
		"no_matching_email":          "no se encontró ninguna dirección de correo electrónico coincidente",
		"user_account_not_activated": "la cuenta de usuario debe ser activada",
		"password_reset_email_sent":  "se le enviará un correo electrónico con instrucciones para restablecer su contraseña",
		"user_already_activated":     "el usuario ya ha sido activado",
		"activation_email_sent":      "se le enviará un correo electrónico con instrucciones de activación",
		// Role messages
		"invalid_project_id_param":      "projectID: no existe o es inválido",
		"role_name_already_exists":      "ya existe para este proyecto",
		"duplicate_permission_ids":      "contienen IDs duplicados",
		"invalid_permission_ids":        "contienen IDs inválidos",
		"invalid_user_ids":              "contienen IDs inválidos",
		"duplicate_user_ids":            "contienen IDs duplicados",
		"role_not_in_project":           "el rol no pertenece al proyecto especificado",
		"role_cannot_be_modified":       "no puede ser modificado",
		"role_cannot_be_deleted":        "no puede ser eliminado",
		"role_deleted_success":          "rol eliminado con éxito",
		"ownership_transferred_success": "propiedad transferida con éxito",
		// Unit messages
		"invalid_unit_type":       "tipo de unidad inválido",
		"duplicate_floor_indexes": "los índices de los pisos deben ser únicos",
		"floor_index_gap":         "los índices de los pisos deben ser continuos sin lagunas",
		"unit_deleted_success":    "unidad eliminada con éxito",
		// Option messages
		"option_deleted_success": "opción de torre eliminada con éxito",
		// Module messages
		"module_deleted_success": "módulo eliminado con éxito",
		// JSON parsing messages
		"json_badly_formed_at":      "el cuerpo contiene JSON malformado (en el carácter %d)",
		"json_badly_formed":         "el cuerpo contiene JSON malformado",
		"json_incorrect_type_field": "el cuerpo contiene tipo JSON incorrecto para el campo %q",
		"json_incorrect_type_at":    "el cuerpo contiene tipo JSON incorrecto (en el carácter %d)",
		"json_body_empty":           "el cuerpo no debe estar vacío",
		"json_unknown_field":        "el cuerpo contiene clave desconocida %s",
		"json_body_too_large":       "el cuerpo no debe ser mayor de %d bytes",
		"json_multiple_values":      "el cuerpo debe contener solo un único valor JSON",
		"json_must_be_integer":      "debe ser un valor entero",
		// Validation messages
		"validation_must_be_provided":         "debe ser proporcionado",
		"validation_greater_than_zero":        "debe ser mayor que cero",
		"validation_max_10_million":           "debe ser un máximo de 10 millones",
		"validation_max_50":                   "debe ser un máximo de 50",
		"validation_valid_sort_value":         "debe ser un valor de ordenación válido (permitido: %s)",
		"validation_valid_email":              "debe ser una dirección de correo electrónico válida",
		"validation_min_8_bytes":              "debe tener al menos 8 bytes",
		"validation_max_72_bytes":             "no debe tener más de 72 bytes",
		"validation_max_500_bytes":            "no debe tener más de 500 bytes",
		"validation_max_100_bytes":            "no debe tener más de 100 bytes",
		"validation_max_20_bytes":             "no debe tener más de 20 bytes",
		"validation_valid_type":               "debe ser un tipo válido (permitido: %s)",
		"validation_not_empty_if_provided":    "no debe estar vacío si se proporciona",
		"validation_exactly_14_digits":        "debe tener exactamente 14 dígitos",
		"validation_only_digits":              "debe contener solo dígitos",
		"validation_valid_cep":                "debe ser un CEP válido",
		"validation_valid_state_code_2":       "debe ser un código de estado válido (2 caracteres)",
		"validation_valid_state_code_allowed": "debe ser un código de estado válido (permitido: %s)",
		"validation_empty_not_allowed":        "%s vacío no está permitido",
		"validation_valid_phase":              "debe ser una fase válida (permitido: %s)",
		"validation_no_duplicate_ids":         "no debe contener IDs duplicados",
		"validation_no_protected_ids":         "no puede contener IDs de permisos protegidos",
		"validation_token_26_bytes":           "debe tener 26 bytes",
		"validation_valid_status":             "debe ser un estado válido (permitido: %s)",
	}
}

// GetLocalizedMessage returns a localized message for the given key and language
func (l *Localizer) GetLocalizedMessage(lang Language, key string) string {
	if msgs, ok := l.messages[lang]; ok {
		if msg, ok := msgs[key]; ok {
			return msg
		}
	}

	// Fallback to default language
	if msgs, ok := l.messages[l.defaultLang]; ok {
		if msg, ok := msgs[key]; ok {
			return msg
		}
	}

	// Return the key if no translation found
	return key
}

// GetLocalizedMessageWithArgs returns a localized message with formatted arguments
func (l *Localizer) GetLocalizedMessageWithArgs(lang Language, key string, args ...interface{}) string {
	msg := l.GetLocalizedMessage(lang, key)
	if len(args) > 0 {
		return fmt.Sprintf(msg, args...)
	}
	return msg
}

// ParseAcceptLanguage parses the Accept-Language header and returns the preferred language
func ParseAcceptLanguage(acceptLang string, supportedLanguages []Language, defaultLang Language) Language {
	if acceptLang == "" {
		return defaultLang
	}

	// Parse the Accept-Language header
	// Format: "en-US,en;q=0.9,pt;q=0.8,es;q=0.7"
	langs := strings.Split(acceptLang, ",")

	// First pass: check if defaultLang is in the header (prioritize it)
	for _, lang := range langs {
		lang = strings.TrimSpace(lang)
		if idx := strings.Index(lang, ";"); idx != -1 {
			lang = lang[:idx]
		}
		langCode := strings.ToLower(lang)
		if idx := strings.Index(langCode, "-"); idx != -1 {
			langCode = langCode[:idx]
		}
		if string(defaultLang) == langCode {
			return defaultLang
		}
	}

	// Second pass: find the first supported language
	for _, lang := range langs {
		lang = strings.TrimSpace(lang)
		if idx := strings.Index(lang, ";"); idx != -1 {
			lang = lang[:idx]
		}
		langCode := strings.ToLower(lang)
		if idx := strings.Index(langCode, "-"); idx != -1 {
			langCode = langCode[:idx]
		}
		for _, supported := range supportedLanguages {
			if string(supported) == langCode {
				return supported
			}
		}
	}

	return defaultLang
}

// GetSupportedLanguages returns the list of supported languages
func GetSupportedLanguages() []Language {
	return []Language{English, Portuguese, Spanish}
}

// GetDefaultLanguage returns the default language
func (l *Localizer) GetDefaultLanguage() Language {
	return l.defaultLang
}

// Global localizer instance for package-level functions
var globalLocalizer *Localizer

// InitGlobal initializes the global localizer
func InitGlobal(defaultLang Language) {
	globalLocalizer = New(defaultLang)
}

// GetMessage returns a localized message for the given key and language using the global localizer
func GetMessage(lang Language, key string) string {
	if globalLocalizer == nil {
		InitGlobal(Portuguese) // Initialize with Portuguese as default if not already initialized
	}
	return globalLocalizer.GetLocalizedMessage(lang, key)
}

// GetMessageWithArgs returns a localized message with formatted arguments using the global localizer
func GetMessageWithArgs(lang Language, key string, args ...interface{}) string {
	if globalLocalizer == nil {
		InitGlobal(Portuguese)
	}
	return globalLocalizer.GetLocalizedMessageWithArgs(lang, key, args...)
}
