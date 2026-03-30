package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"github.com/Benchmark-CO2/bipc/internal/i18n"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
)

func (app *application) readUUIDParam(r *http.Request, name string) (uuid.UUID, error) {
	params := httprouter.ParamsFromContext(r.Context())

	raw := params.ByName(name)

	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid %q parameter: %w", name, err)
	}

	return id, nil
}

func (app *application) readString(qs url.Values, key string, defaultValue string) string {
	s := qs.Get(key)

	if s == "" {
		return defaultValue
	}

	return s
}

func (app *application) readCSV(qs url.Values, key string, defaultValue []string) []string {
	csv := qs.Get(key)

	if csv == "" {
		return defaultValue
	}

	return strings.Split(csv, ",")
}

func (app *application) readInt(qs url.Values, key string, defaultValue int, v *validator.Validator, lang i18n.Language) int {
	s := qs.Get(key)

	if s == "" {
		return defaultValue
	}

	i, err := strconv.Atoi(s)
	if err != nil {
		v.AddError(key, app.localizer.GetLocalizedMessage(lang, "json_must_be_integer"))
		return defaultValue
	}

	return i
}

type envelope map[string]any

func (app *application) writeJSON(w http.ResponseWriter, status int, data envelope, headers http.Header) error {
	js, err := json.MarshalIndent(data, "", "\t")
	if err != nil {
		return err
	}

	js = append(js, '\n')

	for key, value := range headers {
		w.Header()[key] = value
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(js)

	return nil
}

func (app *application) readJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	lang := app.contextGetLanguage(r)

	r.Body = http.MaxBytesReader(w, r.Body, 1_048_576) // 1MB limit

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	err := dec.Decode(dst)
	if err != nil {
		var syntaxError *json.SyntaxError
		var unmarshalTypeError *json.UnmarshalTypeError
		var invalidUnmarshalError *json.InvalidUnmarshalError
		var maxBytesError *http.MaxBytesError

		switch {
		case errors.As(err, &syntaxError):
			return fmt.Errorf(app.localizer.GetLocalizedMessage(lang, "json_badly_formed_at"), syntaxError.Offset)
		case errors.Is(err, io.ErrUnexpectedEOF):
			return errors.New(app.localizer.GetLocalizedMessage(lang, "json_badly_formed"))
		case errors.As(err, &unmarshalTypeError):
			if unmarshalTypeError.Field != "" {
				return fmt.Errorf(app.localizer.GetLocalizedMessage(lang, "json_incorrect_type_field"), unmarshalTypeError.Field)
			}
			return fmt.Errorf(app.localizer.GetLocalizedMessage(lang, "json_incorrect_type_at"), unmarshalTypeError.Offset)
		case errors.Is(err, io.EOF):
			return errors.New(app.localizer.GetLocalizedMessage(lang, "json_body_empty"))
		case strings.HasPrefix(err.Error(), "json: unknown field "):
			fieldName := strings.TrimPrefix(err.Error(), "json: unknown field ")
			return fmt.Errorf(app.localizer.GetLocalizedMessage(lang, "json_unknown_field"), fieldName)
		case errors.As(err, &maxBytesError):
			return fmt.Errorf(app.localizer.GetLocalizedMessage(lang, "json_body_too_large"), maxBytesError.Limit)
		case errors.As(err, &invalidUnmarshalError):
			panic("readJSON: destination (dst) must be a non-nil pointer") // The decode destination is not valid (usually because it is not a pointer). This is actually a problem with our application code, not the JSON itself.
		default:
			return err
		}
	}

	err = dec.Decode(&struct{}{})
	if !errors.Is(err, io.EOF) {
		return errors.New(app.localizer.GetLocalizedMessage(lang, "json_multiple_values"))
	}

	return nil
}

func (app *application) background(fn func()) {
	app.wg.Add(1)

	go func() {
		defer app.wg.Done()

		defer func() {
			if err := recover(); err != nil {
				app.logger.Error(fmt.Sprintf("%v", err))
			}
		}()

		fn()
	}()
}

func generateDuplicateName(originalName string) string {
	pattern := regexp.MustCompile(`^(.+)\s+\((\d+)\)$`)
	matches := pattern.FindStringSubmatch(originalName)

	if matches != nil {
		baseName := matches[1]
		number, _ := strconv.Atoi(matches[2])
		return fmt.Sprintf("%s (%d)", baseName, number+1)
	}

	return fmt.Sprintf("%s (1)", originalName)
}
