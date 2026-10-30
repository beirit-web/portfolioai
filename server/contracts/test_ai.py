import io
import json
import tempfile
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from django.test import Client, SimpleTestCase, override_settings

from . import ai_service
from .definitions import TEMPLATES
from .forms import ContractForm


@override_settings(CONTRACTS_AI_ENABLED=True, CONTRACTS_GEMINI_API_KEY='fictional-test-key', CONTRACTS_AI_DAILY_LIMIT=20)
class AssistantTests(SimpleTestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.override = override_settings(CONTRACTS_AI_USAGE_PATH=Path(self.tmp.name) / 'usage.sqlite3')
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.data = {'template': 'purchase', 'action': 'generate', 'prompt': 'Fiktiver Kauf eines Fahrrads für 180 Euro.', 'consent': 'yes'}

    def response(self, fields, reason='STOP'):
        return io.BytesIO(json.dumps({'candidates': [{'finishReason': reason, 'content': {'parts': [{'text': json.dumps(fields)}]}}]}).encode())

    @patch('contracts.ai_service.build_opener')
    def test_structured_result_uses_server_template_and_header_secret(self, opener):
        opener.return_value.open.return_value = self.response(TEMPLATES['purchase']['sample'])
        result = self.client.post('/vertragsgenerator/assistent/', self.data)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()['source'], 'gemini')
        self.assertIn('Unterschrift', result.json()['text'])
        self.assertIn('no-store', result['Cache-Control'])
        request = opener.return_value.open.call_args.args[0]
        self.assertNotIn('fictional-test-key', request.full_url)
        self.assertEqual(request.get_header('X-goog-api-key'), 'fictional-test-key')
        self.assertNotIn('fictional-test-key', result.content.decode())

    @patch('contracts.ai_service.build_opener')
    def test_rental_result_keeps_raw_fields_and_separate_formatted_document_values(self, opener):
        fields = {**TEMPLATES['rent']['sample'], 'miete': '0', 'kaution': '',
                  'vermieter': 'Alex Beispiel\n\nMusterweg 1\n12345 Musterstadt',
                  'zusatz': '1. Schlüssel erhalten\n\n2. Zähler abgelesen'}
        opener.return_value.open.return_value = self.response(fields)
        response = self.client.post('/vertragsgenerator/assistent/', {**self.data, 'template': 'rent'})
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result['fields'], fields)
        self.assertEqual(result['documentValues']['miete'], '0,00 €')
        self.assertEqual(result['documentValues']['kaution'], '')
        self.assertEqual(result['documentValues']['beginn'], '01.01.2026')
        self.assertEqual(result['documentValues']['vermieter'], fields['vermieter'])
        self.assertEqual(result['documentValues']['zusatz'], fields['zusatz'])
        self.assertEqual(result['text'], ContractForm('rent', fields).document())

    @patch('contracts.ai_service.build_opener')
    def test_disabled_and_invalid_input_never_contact_provider(self, opener):
        with override_settings(CONTRACTS_AI_ENABLED=False):
            self.assertEqual(self.client.post('/vertragsgenerator/assistent/', self.data).status_code, 503)
        for extra in ({'consent': ''}, {'action': 'unknown'}, {'template': 'unknown'}, {'prompt': 'short'}, {'prompt': 'a' * 5001}):
            self.assertEqual(self.client.post('/vertragsgenerator/assistent/', {**self.data, **extra}).status_code, 400)
        opener.assert_not_called()

    def test_csrf_and_method_are_required(self):
        self.assertEqual(Client(enforce_csrf_checks=True).post('/vertragsgenerator/assistent/', self.data).status_code, 403)
        self.assertEqual(self.client.get('/vertragsgenerator/assistent/').status_code, 405)

    @patch('contracts.ai_service.reserve_request')
    @patch('contracts.ai_service.build_opener')
    def test_provider_failures_and_invalid_results_are_sanitized(self, opener, reserve):
        for error, status in ((HTTPError('https://example.test', 429, 'private provider details', {}, None), 429),
                              (HTTPError('https://example.test', 403, 'fictional-test-key', {}, None), 502),
                              (URLError('private details'), 502)):
            opener.return_value.open.side_effect = error
            response = self.client.post('/vertragsgenerator/assistent/', self.data)
            self.assertEqual(response.status_code, status)
            self.assertNotIn('private', response.content.decode())
            self.assertNotIn('fictional-test-key', response.content.decode())
        opener.return_value.open.side_effect = None
        for values, reason in (([], 'STOP'), ({'unexpected': 'text'}, 'STOP'),
                               ({**TEMPLATES['purchase']['sample'], 'price': '-1'}, 'STOP'),
                               (TEMPLATES['purchase']['sample'], 'MAX_TOKENS')):
            opener.return_value.open.return_value = self.response(values, reason)
            self.assertEqual(self.client.post('/vertragsgenerator/assistent/', self.data).status_code, 502)

    @patch('contracts.ai_service.build_opener')
    def test_unavailable_model_is_reported_without_retries_or_fallback(self, opener):
        opener.return_value.open.side_effect = HTTPError('https://example.test', 404, 'private provider details', {}, None)
        response = self.client.post('/vertragsgenerator/assistent/', self.data)
        self.assertEqual(response.status_code, 502)
        self.assertIn('Modellkonfiguration', response.json()['error'])
        self.assertNotIn('private', response.content.decode())
        opener.return_value.open.assert_called_once()

    @patch('contracts.ai_service.build_opener')
    def test_rewrite_action_returns_text(self, opener):
        opener.return_value.open.return_value = self.response({'text': 'Der fiktive Kaufpreis beträgt 180 Euro.'})
        response = self.client.post('/vertragsgenerator/assistent/', {**self.data, 'action': 'improve'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['text'], 'Der fiktive Kaufpreis beträgt 180 Euro.')
        self.assertNotIn('fields', response.json())

    @patch('contracts.ai_service.time.time', return_value=1800000000)
    def test_limits_are_persistent_and_count_failed_attempts(self, clock):
        ai_service.reserve_request()
        with self.assertRaises(ai_service.AIError) as error:
            ai_service.reserve_request()
        self.assertEqual(error.exception.status, 429)
        clock.return_value += 11
        with override_settings(CONTRACTS_AI_DAILY_LIMIT=1):
            with self.assertRaises(ai_service.AIError):
                ai_service.reserve_request()
        clock.return_value += 86400
        ai_service.reserve_request()

    @patch('contracts.ai_service.build_opener')
    def test_budget_failure_prevents_network_call(self, opener):
        with override_settings(CONTRACTS_AI_DAILY_LIMIT=0):
            response = self.client.post('/vertragsgenerator/assistent/', self.data)
        self.assertEqual(response.status_code, 429)
        opener.assert_not_called()
