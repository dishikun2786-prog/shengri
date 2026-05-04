'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface CityTreeNode {
  code: string;
  name: string;
  lng?: number;
  lat?: number;
  children?: CityTreeNode[];
}

export interface CitySelection {
  name: string;
  province: string;
  city: string;
  district: string;
  code: string;
}

interface CityPickerProps {
  value?: string;
  onChange: (selection: CitySelection) => void;
  placeholder?: string;
}

const HOT_CITIES: { label: string; province: string; city: string; district: string }[] = [
  { label: '北京', province: '北京市', city: '市辖区', district: '东城区' },
  { label: '上海', province: '上海市', city: '市辖区', district: '黄浦区' },
  { label: '广州', province: '广东省', city: '广州市', district: '天河区' },
  { label: '深圳', province: '广东省', city: '深圳市', district: '福田区' },
  { label: '成都', province: '四川省', city: '成都市', district: '锦江区' },
  { label: '杭州', province: '浙江省', city: '杭州市', district: '上城区' },
  { label: '武汉', province: '湖北省', city: '武汉市', district: '武昌区' },
  { label: '南京', province: '江苏省', city: '南京市', district: '玄武区' },
  { label: '重庆', province: '重庆市', city: '市辖区', district: '渝中区' },
  { label: '西安', province: '陕西省', city: '西安市', district: '雁塔区' },
  { label: '长沙', province: '湖南省', city: '长沙市', district: '岳麓区' },
  { label: '天津', province: '天津市', city: '市辖区', district: '和平区' },
];

let treeDataCache: CityTreeNode[] | null = null;

export default function CityPicker({ value, onChange, placeholder = '选择出生城市' }: CityPickerProps) {
  const [treeData, setTreeData] = useState<CityTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);

  const [selectedProvince, setSelectedProvince] = useState<CityTreeNode | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityTreeNode | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<CityTreeNode | null>(null);

  const [activeTab, setActiveTab] = useState<'hot' | 'cascade'>('hot');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      if (treeDataCache) {
        setTreeData(treeDataCache);
        setLoading(false);
        return;
      }
      try {
        const resp = await fetch('/data/city-tree.json');
        const data = await resp.json();
        treeDataCache = data;
        setTreeData(data);
      } catch {
        setTreeData([]);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const flatList = useMemo(() => {
    const items: SearchHit[] = [];
    for (const p of treeData) {
      for (const c of (p.children || [])) {
        for (const d of (c.children || [])) {
          if (d.children && d.children.length > 0) {
            for (const sub of d.children) {
              items.push({
                province: p.name,
                city: c.name,
                district: sub.name,
                code: sub.code,
                path: `${p.name} > ${c.name} > ${sub.name}`,
                searchText: `${p.name}${c.name}${sub.name}`,
              });
            }
          } else {
            items.push({
              province: p.name,
              city: c.name,
              district: d.name,
              code: d.code,
              path: `${p.name} > ${c.name} > ${d.name}`,
              searchText: `${p.name}${c.name}${d.name}`,
            });
          }
        }
      }
    }
    return items;
  }, [treeData]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.trim().toLowerCase();
    const hits = flatList.filter(item =>
      item.searchText.toLowerCase().includes(q)
    ).slice(0, 20);
    setSearchResults(hits);
  }, [searchQuery, flatList]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  const handleSelectDistrict = useCallback((province: string, city: string, district: string, code: string) => {
    const fullName = `${province}${district}`;
    setSelectedDistrict({ code, name: district });
    onChange({ name: fullName, province, city, district, code });
    setIsOpen(false);
    setSearchQuery('');
  }, [onChange]);

  const handleHotCity = useCallback((hot: typeof HOT_CITIES[0]) => {
    handleSelectDistrict(hot.province, hot.city, hot.district, '');
  }, [handleSelectDistrict]);

  const handleSearchSelect = useCallback((hit: SearchHit) => {
    handleSelectDistrict(hit.province, hit.city, hit.district, hit.code);
  }, [handleSelectDistrict]);

  const displayValue = value || '';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="input-field w-full text-left flex items-center justify-between"
      >
        <span className={displayValue ? 'text-ink-800' : 'text-ink-400'}>
          {displayValue || placeholder}
        </span>
        <svg className={`w-4 h-4 text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl border border-ink-200 overflow-hidden animate-fade-in" style={{ minWidth: 340 }}>
          {/* Search */}
          <div className="p-3 border-b border-ink-100">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索省市区名称..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 bg-ink-50"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-center text-ink-400 text-sm">加载城市数据中...</div>
          ) : searchQuery.trim() ? (
            /* Search Results */
            <div className="max-h-72 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-6 text-center text-ink-400 text-sm">未找到匹配城市</div>
              ) : (
                searchResults.map((hit, i) => (
                  <button
                    key={`${hit.code}-${i}`}
                    type="button"
                    onClick={() => handleSearchSelect(hit)}
                    className="w-full text-left px-4 py-2.5 hover:bg-primary-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <span className="text-sm font-medium text-ink-800">{hit.district}</span>
                      <span className="text-xs text-ink-400 ml-2">{hit.path}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Main content: tabs */
            <>
              <div className="flex border-b border-ink-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('hot')}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === 'hot' ? 'text-primary-600 border-b-2 border-primary-500' : 'text-ink-500 hover:text-ink-700'}`}
                >
                  热门城市
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cascade')}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === 'cascade' ? 'text-primary-600 border-b-2 border-primary-500' : 'text-ink-500 hover:text-ink-700'}`}
                >
                  省市区选择
                </button>
              </div>

              {activeTab === 'hot' ? (
                <div className="p-3">
                  <div className="grid grid-cols-4 gap-2">
                    {HOT_CITIES.map((hot) => (
                      <button
                        key={hot.label}
                        type="button"
                        onClick={() => handleHotCity(hot)}
                        className="py-2 px-1 text-sm text-ink-700 bg-ink-50 rounded-lg hover:bg-primary-50 hover:text-primary-700 transition-colors text-center font-medium"
                      >
                        {hot.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <CascadePanel
                  treeData={treeData}
                  selectedProvince={selectedProvince}
                  selectedCity={selectedCity}
                  onSelectProvince={(p) => { setSelectedProvince(p); setSelectedCity(null); setSelectedDistrict(null); }}
                  onSelectCity={(c) => { setSelectedCity(c); setSelectedDistrict(null); }}
                  onSelectDistrict={(d) => {
                    if (selectedProvince && selectedCity) {
                      handleSelectDistrict(selectedProvince.name, selectedCity.name, d.name, d.code);
                    }
                  }}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface SearchHit {
  province: string;
  city: string;
  district: string;
  code: string;
  path: string;
  searchText: string;
}

interface CascadePanelProps {
  treeData: CityTreeNode[];
  selectedProvince: CityTreeNode | null;
  selectedCity: CityTreeNode | null;
  onSelectProvince: (p: CityTreeNode) => void;
  onSelectCity: (c: CityTreeNode) => void;
  onSelectDistrict: (d: CityTreeNode) => void;
}

function CascadePanel({ treeData, selectedProvince, selectedCity, onSelectProvince, onSelectCity, onSelectDistrict }: CascadePanelProps) {
  return (
    <div className="flex h-64">
      {/* Province */}
      <div className="w-1/3 border-r border-ink-100 overflow-y-auto">
        {treeData.map((p) => (
          <button
            key={p.code}
            type="button"
            onClick={() => onSelectProvince(p)}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              selectedProvince?.code === p.code
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-ink-700 hover:bg-ink-50'
            }`}
          >
            {p.name.replace(/(壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区)$/, '').replace(/省$/, '')}
          </button>
        ))}
      </div>

      {/* City */}
      <div className="w-1/3 border-r border-ink-100 overflow-y-auto">
        {selectedProvince?.children?.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => onSelectCity(c)}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              selectedCity?.code === c.code
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-ink-700 hover:bg-ink-50'
            }`}
          >
            {c.name}
          </button>
        ))}
        {!selectedProvince && (
          <div className="p-4 text-center text-ink-400 text-xs">请先选择省份</div>
        )}
      </div>

      {/* District */}
      <div className="w-1/3 overflow-y-auto">
        {selectedCity?.children?.map((d) => {
          if (d.children && d.children.length > 0) {
            return d.children.map((sub) => (
              <button
                key={sub.code + sub.name}
                type="button"
                onClick={() => onSelectDistrict(sub)}
                className="w-full text-left px-3 py-2 text-sm text-ink-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
              >
                {sub.name}
              </button>
            ));
          }
          return (
            <button
              key={d.code}
              type="button"
              onClick={() => onSelectDistrict(d)}
              className="w-full text-left px-3 py-2 text-sm text-ink-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
            >
              {d.name}
            </button>
          );
        })}
        {!selectedCity && (
          <div className="p-4 text-center text-ink-400 text-xs">请先选择城市</div>
        )}
      </div>
    </div>
  );
}
