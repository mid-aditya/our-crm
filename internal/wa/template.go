package wa

import (
	"regexp"
	"strings"
)

var varRe = regexp.MustCompile(`\{\{\s*([\w.]+)\s*\}\}`)

// RenderTemplate mengganti {{variabel}} (case-insensitive).
// Key tak dikenal dibiarkan apa adanya agar typo mudah terdeteksi.
func RenderTemplate(tpl string, vars map[string]string) string {
	lowered := make(map[string]string, len(vars))
	for k, v := range vars {
		lowered[strings.ToLower(k)] = v
	}
	return varRe.ReplaceAllStringFunc(tpl, func(m string) string {
		key := strings.ToLower(strings.TrimSpace(m[2:len(m)-2]))
		if v, ok := lowered[key]; ok {
			return v
		}
		return m
	})
}

// ContactVars memetakan field kontak ke variabel template.
func ContactVars(fullName, company, email, phone string) map[string]string {
	first := fullName
	if i := strings.Index(first, " "); i > 0 {
		first = first[:i]
	}
	return map[string]string{
		"nama":          first,
		"nama_lengkap":  fullName,
		"perusahaan":    company,
		"email":         email,
		"hp":            phone,
	}
}
