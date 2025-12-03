import { useState, useEffect } from 'react';
import { API } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const AIAssistant = () => {
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [requestType, setRequestType] = useState('risk_assessment');
  const [context, setContext] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchVessels();
  }, []);

  const fetchVessels = async () => {
    try {
      const response = await axios.get(`${API}/vessels`);
      setVessels(response.data);
      if (response.data.length > 0) {
        setSelectedVessel(response.data[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch vessels');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setResult(null);

    try {
      let contextData = {};
      
      if (requestType === 'risk_assessment') {
        contextData = {
          operation_details: context,
          vessel_class: selectedVessel.vessel_class,
          operating_area: 'Australian waters'
        };
      } else if (requestType === 'compliance_check') {
        contextData = {
          vessel_class: selectedVessel.vessel_class,
          sms_type: selectedVessel.sms_type,
          documents: context
        };
      } else if (requestType === 'document_analysis') {
        contextData = {
          document_type: 'SMS Document',
          content: context
        };
      }

      const response = await axios.post(`${API}/ai/assist`, {
        vessel_id: selectedVessel.id,
        request_type: requestType,
        context: contextData
      });

      setResult(response.data);
      toast.success('AI analysis complete');
    } catch (error) {
      toast.error('AI processing failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </Layout>
    );
  }

  if (vessels.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-white mb-2">No Vessels Available</h2>
          <p className="text-gray-600 mb-6">Please add a vessel first.</p>
          <a href="/vessels" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Go to Vessels
          </a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div data-testid="ai-assistant" className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Bot className="w-8 h-8 text-blue-400" />
            AI Safety Assistant
          </h1>
          <p className="text-gray-600">Powered by Google Gemini for risk assessment, compliance checking, and document analysis</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">AI Request</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {vessels.length > 1 && (
                  <div>
                    <Label className="text-gray-700">Select Vessel</Label>
                    <select
                      data-testid="ai-vessel-select"
                      value={selectedVessel?.id || ''}
                      onChange={(e) => setSelectedVessel(vessels.find(v => v.id === e.target.value))}
                      className="w-full p-2 rounded-md bg-gray-50 border-gray-300 text-white border"
                    >
                      {vessels.map((vessel) => (
                        <option key={vessel.id} value={vessel.id}>
                          {vessel.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <Label className="text-gray-700">Analysis Type</Label>
                  <select
                    data-testid="request-type-select"
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="w-full p-2 rounded-md bg-gray-50 border-gray-300 text-white border"
                  >
                    <option value="risk_assessment">Risk Assessment Generation</option>
                    <option value="compliance_check">Compliance Checking</option>
                    <option value="document_analysis">Document Analysis</option>
                  </select>
                </div>

                <div>
                  <Label className="text-gray-700">
                    {requestType === 'risk_assessment' && 'Describe Operation/Activity'}
                    {requestType === 'compliance_check' && 'Describe Current Documentation'}
                    {requestType === 'document_analysis' && 'Paste Document Content'}
                  </Label>
                  <Textarea
                    data-testid="context-input"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={10}
                    required
                    className="bg-gray-50 border-gray-300 text-gray-900"
                    placeholder={
                      requestType === 'risk_assessment'
                        ? 'Describe the vessel operation, activities, environmental conditions, etc.'
                        : requestType === 'compliance_check'
                        ? 'Describe your current SMS documentation and policies'
                        : 'Paste the document content you want to analyze'
                    }
                  />
                </div>

                <Button
                  type="submit"
                  data-testid="submit-ai-request"
                  disabled={processing}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                AI Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="text-center py-12">
                  <Bot className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Submit a request to see AI analysis</p>
                </div>
              ) : (
                <div data-testid="ai-result" className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-blue-400 mb-3">Analysis:</h3>
                    <div className="text-slate-200 whitespace-pre-wrap text-sm leading-relaxed">
                      {result.result}
                    </div>
                  </div>

                  {result.suggestions && result.suggestions.length > 0 && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <h3 className="text-sm font-semibold text-purple-400 mb-3">Key Recommendations:</h3>
                      <ul className="space-y-2">
                        {result.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="text-slate-200 text-sm flex items-start gap-2">
                            <span className="text-purple-400 mt-1">•</span>
                            <span>{suggestion.replace(/^[-•]\s*/, '')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-none text-gray-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="font-semibold">Risk Assessment</h3>
              </div>
              <p className="text-sm text-blue-100">Generate comprehensive risk assessments based on your operations and AMSA requirements</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-none text-gray-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-semibold">Compliance Check</h3>
              </div>
              <p className="text-sm text-purple-100">Verify your SMS documentation against Marine Order 504 requirements</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-600 to-teal-700 border-none text-gray-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Send className="w-5 h-5" />
                </div>
                <h3 className="font-semibold">Document Analysis</h3>
              </div>
              <p className="text-sm text-teal-100">Analyze SMS documents for compliance gaps and improvement opportunities</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default AIAssistant;