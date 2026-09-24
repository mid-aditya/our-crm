package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"crm-backend/internal/middleware"
)

// ListChannelTypes returns all available channel types
func ChannelTypes(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	rows, err := pool.Query(r.Context(),
		`SELECT id, name, icon, color, description, config_schema FROM channel_types ORDER BY name`)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal mengambil channel types")
		return
	}
	defer rows.Close()

	types := []map[string]interface{}{}
	for rows.Next() {
		var id, name, icon, color, description string
		var schema []byte
		rows.Scan(&id, &name, &icon, &color, &description, &schema)
		var schemaMap map[string]interface{}
		json.Unmarshal(schema, &schemaMap)
		types = append(types, map[string]interface{}{
			"id": id, "name": name, "icon": icon, "color": color,
			"description": description, "config_schema": schemaMap,
		})
	}
	middleware.WriteOK(w, types)
}

// ListCompanyChannels returns enabled channels for the current company
func CompanyChannels(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	companyID := middleware.Claims(r).CompanyID

	rows, err := pool.Query(r.Context(), `
		SELECT cc.id, cc.channel_type_id, cc.status, cc.enabled_at, cc.last_error,
			   ct.name, ct.icon, ct.color,
			   (SELECT config FROM channel_configs WHERE company_channel_id = cc.id AND is_default = true LIMIT 1) as config
		FROM company_channels cc
		JOIN channel_types ct ON ct.id = cc.channel_type_id
		WHERE cc.company_id = $1
		ORDER BY ct.name`, companyID)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal mengambil channels")
		return
	}
	defer rows.Close()

	channels := []map[string]interface{}{}
	for rows.Next() {
		var id string
		var typeID, status string
		var enabledAt sql.NullTime
		var lastErr []byte
		var name, icon, color string
		var config []byte
		rows.Scan(&id, &typeID, &status, &enabledAt, &lastErr, &name, &icon, &color, &config)

		var configMap map[string]interface{}
		if len(config) > 0 {
			json.Unmarshal(config, &configMap)
		}

		var errStr *string
		if len(lastErr) > 0 {
			s := string(lastErr)
			errStr = &s
		}

		var enabledAtVal *time.Time
		if enabledAt.Valid {
			enabledAtVal = &enabledAt.Time
		}
		channels = append(channels, map[string]interface{}{
			"id": id, "channel_type_id": typeID, "status": status,
			"enabled_at": enabledAtVal, "last_error": errStr,
			"name": name, "icon": icon, "color": color,
			"has_config": len(config) > 0,
		})
	}
	middleware.WriteOK(w, channels)
}

// GetCompanyChannel returns a single channel with its config
func GetCompanyChannel(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)

	// Extract channel type ID from path: /company/channels/{typeId}
	path := r.URL.Path
	var typeID string
	if n, _ := parseURLLastSegment(path); n != "" {
		typeID = n
	}
	if typeID == "" {
		middleware.WriteErr(w, 400, "INVALID_TYPE", "channel type ID required")
		return
	}

	companyID := middleware.Claims(r).CompanyID

	var id, status string
	var enabledAt sql.NullTime
	var lastErr []byte
	err := pool.QueryRow(r.Context(), `
		SELECT cc.id, cc.status, cc.enabled_at, cc.last_error
		FROM company_channels cc
		WHERE cc.company_id=$1 AND cc.channel_type_id=$2`, companyID, typeID).
		Scan(&id, &status, &enabledAt, &lastErr)
	if err != nil {
		middleware.WriteErr(w, 404, "NOT_FOUND", "Channel tidak ditemukan")
		return
	}

	// Get channel type info
	var ctName, ctIcon, ctColor, ctDesc string
	var ctSchema []byte
	pool.QueryRow(r.Context(),
		`SELECT name, icon, color, description, config_schema FROM channel_types WHERE id=$1`, typeID).
		Scan(&ctName, &ctIcon, &ctColor, &ctDesc, &ctSchema)

	var schemaMap map[string]interface{}
	json.Unmarshal(ctSchema, &schemaMap)

	// Get configs
	rows, _ := pool.Query(r.Context(),
		`SELECT id, config, webhook_url, is_default, created_at
		 FROM channel_configs WHERE company_channel_id=$1 ORDER BY is_default DESC, created_at`, id)
	defer rows.Close()

	configs := []map[string]interface{}{}
	for rows.Next() {
		var cfgID, webhookURL string
		var cfg []byte
		var isDefault bool
		var createdAt sql.NullTime
		rows.Scan(&cfgID, &cfg, &webhookURL, &isDefault, &createdAt)
		var cfgMap map[string]interface{}
		if len(cfg) > 0 {
			json.Unmarshal(cfg, &cfgMap)
		}
		var createdAtVal *time.Time
		if createdAt.Valid {
			createdAtVal = &createdAt.Time
		}
		configs = append(configs, map[string]interface{}{
			"id": cfgID, "config": cfgMap, "webhook_url": webhookURL,
			"is_default": isDefault, "created_at": createdAtVal,
		})
	}

	var errStr *string
	if len(lastErr) > 0 {
		s := string(lastErr)
		errStr = &s
	}
	var enabledAtVal *time.Time
	if enabledAt.Valid {
		enabledAtVal = &enabledAt.Time
	}

	middleware.WriteOK(w, map[string]interface{}{
		"id": id, "company_id": companyID, "channel_type_id": typeID,
		"status": status, "enabled_at": enabledAtVal, "last_error": errStr,
		"channel_type": map[string]interface{}{
			"name": ctName, "icon": ctIcon, "color": ctColor,
			"description": ctDesc, "config_schema": schemaMap,
		},
		"configs": configs,
	})
}

// EnableChannel enables a channel type for the current company
func EnableChannel(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	companyID := middleware.Claims(r).CompanyID

	var in struct {
		TypeID string `json:"channel_type_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.TypeID == "" {
		middleware.WriteErr(w, 400, "INVALID_REQUEST", "channel_type_id wajib")
		return
	}

	// Verify channel type exists
	var exists bool
	pool.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM channel_types WHERE id=$1)`, in.TypeID).Scan(&exists)
	if !exists {
		middleware.WriteErr(w, 400, "INVALID_TYPE", "Channel type tidak valid")
		return
	}

	// Insert or update (upsert)
	var id string
	err := pool.QueryRow(r.Context(), `
		INSERT INTO company_channels (company_id, channel_type_id, status, enabled_at)
		VALUES ($1, $2, 'active', now())
		ON CONFLICT (company_id, channel_type_id)
		DO UPDATE SET status='active', enabled_at=now(), updated_at=now()
		RETURNING id`,
		companyID, in.TypeID).Scan(&id)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal enable channel")
		return
	}

	// Insert default config
	pool.Exec(r.Context(),
		`INSERT INTO channel_configs (company_channel_id, config, is_default)
		 VALUES ($1, '{}', true)
		 ON CONFLICT DO NOTHING`, id)

	middleware.WriteOK(w, map[string]string{"id": id, "status": "active"})
}

// DisableChannel disables a channel for the current company
func DisableChannel(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	companyID := middleware.Claims(r).CompanyID

	path := r.URL.Path
	var typeID string
	if n, _ := parseURLLastSegment(path); n != "" {
		typeID = n
	}
	if typeID == "" {
		middleware.WriteErr(w, 400, "INVALID_TYPE", "channel type ID required")
		return
	}

	res, err := pool.Exec(r.Context(), `
		UPDATE company_channels
		SET status='inactive', updated_at=now()
		WHERE company_id=$1 AND channel_type_id=$2`,
		companyID, typeID)
	if err != nil || res.RowsAffected() == 0 {
		middleware.WriteErr(w, 404, "NOT_FOUND", "Channel tidak ditemukan")
		return
	}

	middleware.WriteOK(w, map[string]string{"status": "inactive"})
}

// SaveChannelConfig saves or updates the config for a channel
func SaveChannelConfig(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	companyID := middleware.Claims(r).CompanyID

	path := r.URL.Path
	var typeID string
	if n, _ := parseURLLastSegment(path); n != "" {
		typeID = n
	}
	if typeID == "" {
		middleware.WriteErr(w, 400, "INVALID_TYPE", "channel type ID required")
		return
	}

	var in struct {
		Config        map[string]interface{} `json:"config"`
		WebhookURL    string                 `json:"webhook_url"`
		WebhookSecret string                 `json:"webhook_secret"`
		SetDefault    bool                   `json:"set_default"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		middleware.WriteErr(w, 400, "INVALID_REQUEST", "Invalid request body")
		return
	}

	// Get company channel id
	var ccID string
	err := pool.QueryRow(r.Context(),
		`SELECT id FROM company_channels WHERE company_id=$1 AND channel_type_id=$2`,
		companyID, typeID).Scan(&ccID)
	if err != nil {
		middleware.WriteErr(w, 404, "NOT_FOUND", "Channel belum di-enable")
		return
	}

	// Marshal config
	configJSON, _ := json.Marshal(in.Config)

	var configID string
	if in.SetDefault {
		// Update existing default to non-default, then insert new default
		pool.Exec(r.Context(),
			`UPDATE channel_configs SET is_default=false WHERE company_channel_id=$1 AND is_default=true`, ccID)
		err = pool.QueryRow(r.Context(), `
			INSERT INTO channel_configs (company_channel_id, config, webhook_url, webhook_secret, is_default)
			VALUES ($1, $2, $3, $4, true)
			RETURNING id`, ccID, configJSON, in.WebhookURL, in.WebhookSecret).Scan(&configID)
	} else {
		// Update existing default config
		_, err = pool.Exec(r.Context(), `
			UPDATE channel_configs
			SET config=$2, webhook_url=$3, webhook_secret=$4, updated_at=now()
			WHERE company_channel_id=$1 AND is_default=true`,
			ccID, configJSON, in.WebhookURL, in.WebhookSecret)
		if err != nil {
			// No default exists, insert one
			err = pool.QueryRow(r.Context(), `
				INSERT INTO channel_configs (company_channel_id, config, webhook_url, webhook_secret, is_default)
				VALUES ($1, $2, $3, $4, true)
				RETURNING id`, ccID, configJSON, in.WebhookURL, in.WebhookSecret).Scan(&configID)
		} else {
			configID = "updated"
		}
	}

	// Update channel status to active
	pool.Exec(r.Context(),
		`UPDATE company_channels SET status='active', last_error=NULL, updated_at=now() WHERE id=$1`, ccID)

	middleware.WriteOK(w, map[string]interface{}{"id": configID, "status": "active"})
}

// Helper: extract channel type ID from URL path
// Handles both /api/v1/company/channels/wa_official and /api/v1/company/channels/wa_official/configs
func parseURLLastSegment(path string) (string, bool) {
	// Split by / and get segments
	var segments []string
	start := 0
	for i := 0; i <= len(path); i++ {
		if i == len(path) || path[i] == '/' {
			if start < i {
				segments = append(segments, path[start:i])
			}
			start = i + 1
		}
	}

	if len(segments) == 0 {
		return "", false
	}

	last := segments[len(segments)-1]
	// If last is /configs, get the second-to-last as the typeId
	if last == "configs" && len(segments) >= 2 {
		return segments[len(segments)-2], true
	}
	return last, true
}
