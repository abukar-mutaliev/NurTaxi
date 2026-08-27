import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlacementPurpose } from '../../common/enums/compliance.enum';
import { PlacementSite } from './entities/placement-site.entity';
import { PlacementComponent } from './entities/placement-component.entity';
import { PlacementSubcontractor } from './entities/placement-subcontractor.entity';
import { PlacementSiteLog } from './entities/placement-site-log.entity';

export interface UpsertSiteDto {
  name: string;
  operator: string;
  address: string;
  regionCode: string;
  purpose: PlacementPurpose;
  contractRef?: string | null;
  periodFrom: string;
  periodTo?: string | null;
  isActive?: boolean;
}

@Injectable()
export class PlacementService {
  constructor(
    @InjectRepository(PlacementSite) private readonly sites: Repository<PlacementSite>,
    @InjectRepository(PlacementComponent) private readonly components: Repository<PlacementComponent>,
    @InjectRepository(PlacementSubcontractor)
    private readonly subcontractors: Repository<PlacementSubcontractor>,
    @InjectRepository(PlacementSiteLog) private readonly logs: Repository<PlacementSiteLog>,
  ) {}

  list(): Promise<PlacementSite[]> {
    return this.sites.find({
      relations: ['components', 'subcontractors'],
      order: { name: 'ASC' },
    });
  }

  async get(id: string): Promise<PlacementSite> {
    const site = await this.sites.findOne({
      where: { id },
      relations: ['components', 'subcontractors', 'logs'],
    });
    if (!site) {
      throw new NotFoundException({ code: 'SITE_NOT_FOUND', message: 'Площадка не найдена' });
    }
    return site;
  }

  async create(dto: UpsertSiteDto, actorId: string | null): Promise<PlacementSite> {
    const site = await this.sites.save(this.sites.create({ ...dto, isActive: dto.isActive ?? true }));
    await this.log(site.id, 'create', actorId, { after: dto });
    return this.get(site.id);
  }

  async update(id: string, dto: Partial<UpsertSiteDto>, actorId: string | null): Promise<PlacementSite> {
    const site = await this.get(id);
    const before = { ...site };
    Object.assign(site, dto);
    await this.sites.save(site);
    await this.log(id, 'update', actorId, { before, after: dto });
    return this.get(id);
  }

  async attachComponent(
    siteId: string,
    componentKey: string,
    notes: string | null,
    actorId: string | null,
  ): Promise<PlacementComponent> {
    await this.get(siteId);
    const component = await this.components.save(
      this.components.create({ siteId, componentKey, notes }),
    );
    await this.log(siteId, 'attach_component', actorId, { componentKey });
    return component;
  }

  async addSubcontractor(
    siteId: string,
    body: { name: string; role: string; periodFrom: string; periodTo?: string | null },
    actorId: string | null,
  ): Promise<PlacementSubcontractor> {
    await this.get(siteId);
    const sub = await this.subcontractors.save(
      this.subcontractors.create({ siteId, ...body, periodTo: body.periodTo ?? null }),
    );
    await this.log(siteId, 'add_subcontractor', actorId, { name: body.name });
    return sub;
  }

  /** Состояние реестра на указанную дату: площадки, чей период покрывает дату. */
  async snapshotAt(at: string): Promise<PlacementSite[]> {
    return this.sites
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.components', 'c')
      .leftJoinAndSelect('s.subcontractors', 'sub')
      .where('s.period_from <= :at', { at })
      .andWhere('(s.period_to IS NULL OR s.period_to >= :at)', { at })
      .orderBy('s.name', 'ASC')
      .getMany();
  }

  exportDocument(): Promise<PlacementSite[]> {
    return this.list();
  }

  private log(
    siteId: string,
    action: string,
    actorId: string | null,
    payload: Record<string, unknown>,
  ): Promise<PlacementSiteLog> {
    return this.logs.save(this.logs.create({ siteId, action, actorId, payload }));
  }
}
