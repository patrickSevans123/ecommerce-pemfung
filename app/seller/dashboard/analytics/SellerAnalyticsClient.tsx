"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { startOfWeek, format } from 'date-fns'
import { useProtectedRoute } from "@/hooks/useProtectedRoute"
import { Loader } from "@/components/loader"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SimpleChart from "@/components/analytics/SimpleChart"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type OverviewResult = {
  data: {
    totalSales: number
    orderCount: number
    averageOrderValue: number
    totalRevenue: number
    totalDiscount: number
  }
}
type ProductsResult = {
  data: {
    totalProductsSold: number
    uniqueProductsSold: number
    topProducts: { productId: string; productName: string; quantitySold: number; revenue: number }[]
  }
}
type CustomersResult = {
  data: {
    uniqueCustomers: number
    repeatCustomers: number
    repeatCustomerRate: number
    averageOrdersPerCustomer: number
  }
}
type TimeSeriesResult = { success?: boolean; data?: { daily?: { date: string; revenue: number }[]; monthly?: any[] } }

export default function SellerAnalyticsClient() {
  const { isLoading, user } = useProtectedRoute(["seller"])

  const [overview, setOverview] = useState<OverviewResult | null>(null)
  const [products, setProducts] = useState<ProductsResult | null>(null)
  const [customers, setCustomers] = useState<CustomersResult | null>(null)
  const [timeSeries, setTimeSeries] = useState<TimeSeriesResult | null>(null)
  const [chartType, setChartType] = useState<"line" | "bar">("line")
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly" | "all">("daily")
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading || !user?.id || user.role !== "seller") return

    const controller = new AbortController()
    const signal = controller.signal

    const fetchJsonSafely = async (url: string) => {
      try {
        const res = await fetch(url, { signal })
        const text = await res.text()

        if (!text) {
          if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
          return null
        }

        try {
          const data = JSON.parse(text)
          const code = data && typeof data === "object" && "code" in data ? (data as any).code : null
          if (!res.ok) {
            if (res.status === 404 && (code === "NO_ORDERS_FOUND" || code === "NO_DATA_AVAILABLE")) {
              return null
            }
            const msg = data && data.error ? data.error : `HTTP ${res.status} ${res.statusText}`
            throw new Error(msg)
          }
          return data
        } catch (e: any) {
          if (res.status === 404 && text.includes("No orders found")) return null
          throw new Error(`Invalid JSON response from ${url}: ${e?.message ?? e}`)
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return null
        throw e
      }
    }

    const load = async () => {
      setLoadingData(true)
      setError(null)

      try {
        const base = `/api/analytics/${user.id}`
        const endpoints = [
          base + "/overview",
          base + "/products",
          base + "/customers",
          base + "/time-series?granularity=daily",
        ]

        const settled = await Promise.allSettled(endpoints.map((e) => fetchJsonSafely(e)))

        if (settled[0].status === "fulfilled") setOverview(settled[0].value as any)
        else console.warn("Overview fetch failed:", (settled[0] as any).reason)

        if (settled[1].status === "fulfilled") setProducts(settled[1].value as any)
        else console.warn("Products fetch failed:", (settled[1] as any).reason)

        if (settled[2].status === "fulfilled") setCustomers(settled[2].value as any)
        else console.warn("Customers fetch failed:", (settled[2] as any).reason)

        if (settled[3].status === "fulfilled") setTimeSeries(settled[3].value as any)
        else console.warn("Time-series fetch failed:", (settled[3] as any).reason)

        const allFailed = settled.every((s) => s.status === "rejected")
        if (allFailed) {
          const reason = (settled[0] as any).reason || "No data available"
          throw new Error(String(reason))
        }
      } catch (err: any) {
        if (err.name === "AbortError") return
        console.error("Error fetching analytics:", err)
        setError(err?.message || String(err))
      } finally {
        setLoadingData(false)
      }
    }

    load()
    return () => controller.abort()
  }, [isLoading, user])

  useEffect(() => {
    if (isLoading || !user?.id || user.role !== "seller") return

    const controller = new AbortController()
    const signal = controller.signal

    const fetchTimeSeries = async () => {
      setLoadingData(true)
      setError(null)
      try {
        const base = `/api/analytics/${user.id}/time-series`
        const params = new URLSearchParams()

        if (granularity && granularity !== "all") params.set("granularity", granularity)
        if (startDate) params.set("startDate", startDate)
        if (endDate) params.set("endDate", endDate)

        const url = base + (params.toString() ? `?${params.toString()}` : "")
        const res = await fetch(url, { signal })
        if (!res.ok) {
          if (res.status === 404) {
            setTimeSeries(null)
            return
          }
          throw new Error(`Failed to fetch time-series: ${res.status}`)
        }
        const data = await res.json()
        setTimeSeries(data as any)
      } catch (err: any) {
        if (err?.name === "AbortError") return
        console.error("Error fetching time-series:", err)
        setError(err?.message || String(err))
      } finally {
        setLoadingData(false)
      }
    }

    fetchTimeSeries()
    return () => controller.abort()
  }, [isLoading, user, granularity, startDate, endDate])

  const toInputDate = (d: Date) => d.toISOString().slice(0, 10)

  const setPresetRange = (preset: "7d" | "30d" | "90d" | "month") => {
    const now = new Date()
    if (preset === "7d") {
      const s = new Date(now)
      s.setDate(now.getDate() - 6)
      setStartDate(toInputDate(s))
      setEndDate(toInputDate(now))
      setGranularity("daily")
    } else if (preset === "30d") {
      const s = new Date(now)
      s.setDate(now.getDate() - 29)
      setStartDate(toInputDate(s))
      setEndDate(toInputDate(now))
      setGranularity("daily")
    } else if (preset === "90d") {
      const s = new Date(now)
      s.setDate(now.getDate() - 89)
      setStartDate(toInputDate(s))
      setEndDate(toInputDate(now))
      setGranularity("daily")
    } else if (preset === "month") {
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setStartDate(toInputDate(s))
      setEndDate(toInputDate(e))
      setGranularity("daily")
    }
  }

  if (isLoading) return <Loader />

  if (!user || user.role !== "seller") {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">You must be a seller to view analytics.</p>
            <div className="mt-4">
              <Link href="/login">
                <Button variant="outline">Sign in</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground">Seller Analytics</h1>
          <p className="text-muted-foreground mt-2">Track your sales performance and customer insights</p>
        </div>

        {!loadingData &&
          !overview &&
          !products &&
          !customers &&
          (!timeSeries || (timeSeries.data && Object.keys(timeSeries.data).length === 0)) && (
            <div className="mb-8">
              <div className="p-4 bg-secondary border border-border rounded-lg text-foreground">
                <p className="font-medium">No orders found yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Analytics will appear once you have sales. Try creating products and sharing them to get your first
                  orders.
                </p>
              </div>
            </div>
          )}

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
            <p className="font-medium">Error loading data</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData && !overview ? (
                <Loader />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Sales</span>
                    <span className="text-2xl font-bold text-primary">{overview?.data?.totalSales ?? "-"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Orders</span>
                    <span className="text-xl font-semibold text-foreground">{overview?.data?.orderCount ?? "-"}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">Avg. Order Value</span>
                    <span className="text-lg font-semibold text-black">
                      ${overview?.data?.averageOrderValue?.toFixed?.(2) ?? "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                    <span className="text-lg font-semibold text-primary">
                      ${overview?.data?.totalRevenue?.toFixed?.(2) ?? "-"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">Customers</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData && !customers ? (
                <Loader />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Unique Customers</span>
                    <span className="text-2xl font-bold text-primary">{customers?.data?.uniqueCustomers ?? "-"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Repeat Customers</span>
                    <span className="text-xl font-semibold text-foreground">
                      {customers?.data?.repeatCustomers ?? "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">Repeat Rate</span>
                    <span className="text-lg font-semibold text-black">
                      {(customers?.data?.repeatCustomerRate ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg Orders/Customer</span>
                    <span className="text-lg font-semibold text-foreground">
                      {customers?.data?.averageOrdersPerCustomer ?? "-"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingData && !products ? (
                <Loader />
              ) : (
                <div className="space-y-2">
                  {products?.data?.topProducts?.length ? (
                    products.data.topProducts.slice(0, 3).map((p) => (
                      <div
                        key={p.productId}
                        className="flex justify-between items-start py-2 border-b border-border last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.productName}</p>
                          <p className="text-xs text-muted-foreground">{p.quantitySold} sold</p>
                        </div>
                        <p className="text-sm font-semibold text-primary ml-2 shrink-0">${p.revenue.toFixed(0)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">No product data</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-base font-semibold text-foreground">Revenue Trend</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={chartType === "line" ? "default" : "outline"}
                  onClick={() => setChartType("line")}
                  className="text-xs"
                >
                  Line
                </Button>
                <Button
                  size="sm"
                  variant={chartType === "bar" ? "default" : "outline"}
                  onClick={() => setChartType("bar")}
                  className="text-xs"
                >
                  Bar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex flex-col gap-3">
                <Label className="text-sm font-medium">Granularity</Label>
                <Select value={granularity} onValueChange={(v: any) => setGranularity(v)}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">Quick Filters</Label>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPresetRange("7d")} className="text-xs">
                    Last 7 days
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPresetRange("30d")} className="text-xs">
                    30 days
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPresetRange("90d")} className="text-xs">
                    90 days
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPresetRange("month")} className="text-xs">
                    This month
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-sm">
                    From
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate ?? ""}
                    onChange={(e) => setStartDate(e.target.value || null)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate" className="text-sm">
                    To
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate ?? ""}
                    onChange={(e) => setEndDate(e.target.value || null)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {loadingData && !timeSeries ? (
              <Loader />
            ) : (
              <div>
                {(() => {
                  const ds = (() => {
                    if (!timeSeries || !timeSeries.data) return [] as any[]

                    const dailyArr = (timeSeries.data as any).daily || []

                    // Monthly data comes as objects with a `month` key
                    if (granularity === "monthly") {
                      const monthlyArr = (timeSeries.data as any).monthly || []
                      return (monthlyArr || [])
                        .slice()
                        .sort((a: any, b: any) => String(a.month).localeCompare(String(b.month)))
                        .map((d: any) => ({ date: d.month, revenue: Number(d.revenue ?? d.total ?? 0) }))
                    }

                    // Weekly is not provided by the backend; aggregate daily into weeks here
                    if (granularity === "weekly") {
                      const weeklyMap = new Map<string, number>()
                      ;(dailyArr || []).forEach((d: any) => {
                        const dt = new Date(d.date)
                        const wk = format(startOfWeek(dt), 'yyyy-MM-dd')
                        weeklyMap.set(wk, (weeklyMap.get(wk) || 0) + Number(d.revenue ?? 0))
                      })

                      const weeks = Array.from(weeklyMap.entries()).map(([date, revenue]) => ({ date, revenue }))
                      weeks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      return weeks
                    }

                    // Default: daily
                    return (dailyArr || [])
                      .slice()
                      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((d: any) => ({ date: d.date, revenue: Number(d.revenue ?? 0) }))
                  })()

                  if (!ds.length)
                    return (
                      <div className="text-sm text-muted-foreground py-8 text-center">
                        No time-series data available
                      </div>
                    )

                  return (
                    <div>
                      <div className="mb-6 bg-secondary rounded-lg p-4 w-full overflow-x-auto">
                        <SimpleChart data={ds} type={chartType} />
                      </div>

                      {/* Recent Data table removed */}
                    </div>
                  )
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
