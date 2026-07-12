import { Global, Module } from '@nestjs/common';
import { FxService } from './fx.service';

/** FxService is stateless and needed in several modules, so expose it globally. */
@Global()
@Module({
  providers: [FxService],
  exports: [FxService],
})
export class FxModule {}
