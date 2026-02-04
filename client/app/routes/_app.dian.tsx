import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';
import { Button } from '~/components/ui/Button';
import { useDianConfig, useDianStats } from '~/hooks/useDian';
import {
  FileText,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';

export default function DianPage() {
  const { data: config, isLoading: configLoading } = useDianConfig();
  const { data: stats, isLoading: statsLoading } = useDianStats();

  const isConfigured = config?.hasSoftwareConfig && config?.hasResolution && config?.hasCertificate;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Facturacion Electronica DIAN
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Gestiona tus facturas electronicas y notas credito
        </p>
      </div>

      {/* Configuration Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Estado de Configuracion
          </CardTitle>
          <CardDescription>
            Verifica que todos los componentes esten configurados correctamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ) : !config ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                No hay configuracion DIAN. Configura tus datos para empezar a facturar electronicamente.
              </p>
              <Link to="/dian/config">
                <Button>Configurar DIAN</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {config.hasSoftwareConfig ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">Credenciales de Software</p>
                    <p className="text-sm text-gray-500">
                      {config.hasSoftwareConfig ? 'Configuradas' : 'Pendiente'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {config.hasResolution ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">Resolucion DIAN</p>
                    <p className="text-sm text-gray-500">
                      {config.hasResolution
                        ? `${config.resolutionPrefix}${config.resolutionRangeFrom}-${config.resolutionRangeTo}`
                        : 'Pendiente'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {config.hasCertificate ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">Certificado Digital</p>
                    <p className="text-sm text-gray-500">
                      {config.hasCertificate ? 'Cargado' : 'Pendiente'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Modo:</span>
                  <Badge variant={config.testMode ? 'warning' : 'success'}>
                    {config.testMode ? 'Pruebas/Habilitacion' : 'Produccion'}
                  </Badge>
                </div>
                <Link to="/dian/config">
                  <Button variant="outline">Editar Configuracion</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {isConfigured && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Documentos</p>
                  <p className="text-2xl font-bold">
                    {statsLoading ? '...' : stats?.total || 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Aceptados</p>
                  <p className="text-2xl font-bold text-green-600">
                    {statsLoading ? '...' : stats?.accepted || 0}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Rechazados</p>
                  <p className="text-2xl font-bold text-red-600">
                    {statsLoading ? '...' : stats?.rejected || 0}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {statsLoading ? '...' : stats?.pending || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Stats */}
      {isConfigured && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Tasa de Aceptacion</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.acceptanceRate}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Numeracion Disponible</p>
                  <p className="text-2xl font-bold">
                    {stats.remainingNumbers}
                  </p>
                  {stats.remainingNumbers < 100 && stats.remainingNumbers > 0 && (
                    <p className="text-xs text-yellow-600">Renovar pronto</p>
                  )}
                </div>
                <FileText className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rapidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/dian/documents">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 w-full"
              >
                <FileText className="h-6 w-6" />
                <span>Ver Documentos</span>
              </Button>
            </Link>

            <Link to="/invoices/new">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 w-full"
              >
                <FileText className="h-6 w-6" />
                <span>Nueva Factura</span>
              </Button>
            </Link>

            <Link to="/dian/config">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 w-full"
              >
                <Settings className="h-6 w-6" />
                <span>Configuracion</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
